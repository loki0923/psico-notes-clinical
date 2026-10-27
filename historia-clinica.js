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
        let fpvNumber = '';
        let regionalCollege = '';
        let mppsNumber = '';

        if (typeof AppState !== 'undefined' && AppState.currentUser) {
            name = AppState.currentUser.name || '';
            specialty = AppState.currentUser.specialty || '';
            registry = AppState.currentUser.registryNumber || '';
            fpvNumber = AppState.currentUser.fpvNumber || '';
            regionalCollege = AppState.currentUser.regionalCollege || '';
            mppsNumber = AppState.currentUser.mppsNumber || '';
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
        if (!fpvNumber && typeof localStorage !== 'undefined') {
            fpvNumber = localStorage.getItem('psico_therapist_fpv') || '';
        }
        if (!regionalCollege && typeof localStorage !== 'undefined') {
            regionalCollege = localStorage.getItem('psico_therapist_college') || '';
        }
        if (!mppsNumber && typeof localStorage !== 'undefined') {
            mppsNumber = localStorage.getItem('psico_therapist_mpps') || '';
        }

        // Formato compuesto protocolizado para Venezuela
        let formattedRegistry = registry;
        if (fpvNumber || regionalCollege || mppsNumber) {
            const parts = [];
            if (fpvNumber) parts.push(`FPV N.º ${fpvNumber}`);
            if (regionalCollege) parts.push(regionalCollege);
            if (mppsNumber) parts.push(`MPPS N.º ${mppsNumber}`);
            formattedRegistry = parts.join(' · ');
        }

        return {
            name: name || 'Dr(a). / Lic. Profesional Clínico',
            specialty: specialty || 'Psicología Clínica / Salud Mental',
            registry: formattedRegistry || registry || 'Colegiatura Psicológica FPV / MPPS N.º Reg.',
            fpv: fpvNumber,
            college: regionalCollege,
            mpps: mppsNumber
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

            // Contacto de Emergencia
            emergencyContactName: patient.emergencyContactName || '',
            emergencyContactRelation: patient.emergencyContactRelation || '',
            emergencyContactPhone: patient.emergencyContactPhone || '',

            // Situación / Enfermedad Actual (Historia del Problema y Evolución)
            currentIllness: patient.currentIllness || patient.illnessHistory || '',

            // Ficha Representante / Tutor Legal (LOPNNA)
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
            mentalOrientation: patient.mentalOrientation || '',
            mentalAttention: patient.mentalAttention || '',
            mentalThought: patient.mentalThought || '',
            mentalAffect: patient.mentalAffect || '',
            mentalJudgment: patient.mentalJudgment || '',
            mentalSuicidalRisk: patient.mentalSuicidalRisk || 'Descartado / Negativo',
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
            sexuality: patient.sexuality || patient.childSexuality || '',
            spirituality: patient.spirituality || patient.childSpirituality || '',

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
            onychophagy: patient.onychophagy || patient.ornicofagia || '',
            ornicofagia: patient.ornicofagia || patient.onychophagy || '',
            sleepPattern: patient.sleepPattern || '',
            eatingPattern: patient.eatingPattern || '',
            hygienePattern: patient.hygienePattern || '',
            recreationArea: patient.recreationArea || '',
            dailyRoutine: patient.dailyRoutine || '',
            shortTermGoals: patient.shortTermGoals || '',
            mediumTermGoals: patient.mediumTermGoals || patient.midTermGoals || '',
            longTermGoals: patient.longTermGoals || '',

            // L. Impresión Diagnóstica y Plan Terapéutico
            diagnosticImpression: patient.diagnosticImpression || patient.diagnosis || '',
            treatmentPlan: patient.treatmentPlan || ''
        };
    },

    renderChildHistoryIntegral(patient, h, therapist, regInfo) {
        const getStatusChipClass = (st) => {
            if (!st) return 'status-por-iniciar';
            return 'status-' + st.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
        };

        const referralChips = (h.referral && h.referral.length > 0)
            ? (Array.isArray(h.referral) ? h.referral.map(r => `<span class="tag tag-sm" style="margin-right:4px;">${r}</span>`).join('') : `<span class="tag tag-sm">${h.referral}</span>`)
            : (h.referredBy ? `<span class="tag tag-sm">${h.referredBy}</span>` : '<span style="color:var(--text-tertiary);">No especificado</span>');

        return `
            <div class="clinical-history-toolbar">
                <div class="cht-title">
                    <span class="cht-badge">🧒 Historia Clínica Infantil (7 Pág. Oficial)</span>
                    <small>Modelo Oficial Protocolizado · ${therapist.name} (${therapist.specialty}${regInfo})</small>
                </div>
                <div class="cht-actions">
                    <button class="btn-primary" onclick="ClinicalHistorySystem.openFullHistoryEditor('${patient.id}')">
                        <i class="fas fa-edit"></i> Editar Historia Completa
                    </button>
                    <button class="btn-secondary" onclick="if(typeof editPatient==='function'){editPatient('${patient.id}'); closeModal('patientDetailModal');}">
                        <i class="fas fa-user-edit"></i> Ficha Básica
                    </button>
                    <button class="btn-secondary" onclick="ClinicalHistorySystem.openGenogramModal('${patient.id}')">
                        <i class="fas fa-sitemap"></i> Genograma
                    </button>
                    <button class="btn-secondary" onclick="ClinicalHistorySystem.exportHistoriaOficialPDF('${patient.id}')">
                        <i class="fas fa-print"></i> PDF Oficial (7 Pág.)
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

            ${this.renderKidActivitiesCard(patient)}

            <div class="accordion-history-container">
                <!-- SECCIÓN 1: DATOS DE IDENTIFICACIÓN DEL PACIENTE & CONVIVENCIA -->
                <div class="hist-acc-item active" id="acc_sec_1">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_1')">
                        <div class="hist-acc-title">
                            <span class="acc-num">1</span>
                            <strong>📋 Datos de Identificación del Paciente & Convivencia</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div style="background:var(--bg-secondary);padding:10px 14px;border-radius:8px;margin-bottom:14px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:13px;">
                            <div><strong>Ha asistido antes a Consulta Psicológica:</strong> <span class="tag tag-sm ${h.hasAttendedBefore === 'SI' ? 'tag-primary' : 'tag-neutral'}">${h.hasAttendedBefore === 'SI' ? 'SÍ' : 'NO'}</span></div>
                            <div><strong>Fecha:</strong> ${h.previousAttendanceDate || '—'}</div>
                        </div>
                        <div class="hist-grid-data">
                            <div><strong>Nombre Completo del Paciente:</strong> ${patient.name || 'Sin registrar'}</div>
                            <div><strong>Lugar y Fecha de Nacimiento:</strong> ${h.birthPlace ? h.birthPlace + ' · ' : ''}${patient.birthdate ? patient.birthdate.split('-').reverse().join('/') : '—'}</div>
                            <div><strong>Edad:</strong> ${h.age ? `${h.age} años` : (patient.birthdate && typeof calculateAge === 'function' ? `${calculateAge(patient.birthdate)} años` : 'No registrada')}</div>
                            <div><strong>Sexo:</strong> ${patient.gender || 'No registrado'}</div>
                            <div><strong>Escolaridad:</strong> ${patient.schoolGrade || h.schoolGrade || 'No registrado'}</div>
                            <div><strong>Vive con:</strong> ${h.livesWith || 'No especificado'}</div>
                            <div style="grid-column: span 2;"><strong>Domicilio:</strong> ${h.address || patient.address || 'No registrado'}</div>
                            <div style="grid-column: span 2;">
                                <strong>Referido por:</strong> ${referralChips}
                            </div>
                        </div>

                        <div class="hist-sub-heading" style="margin-top:20px;">Datos Filiatorios de los Progenitores (Padres)</div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;margin-bottom:14px;">
                            <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--border-secondary);">
                                <h5 style="margin-top:0;font-weight:700;"><i class="fas fa-female" style="color:#db2777;"></i> Madre</h5>
                                <div style="font-size:13px;line-height:1.5;">
                                    <div><strong>Nombre Completo:</strong> ${h.motherName || '—'}</div>
                                    <div><strong>Edad:</strong> ${h.motherAge ? h.motherAge + ' años' : '—'} · <strong>C.I:</strong> ${h.motherCI || '—'}</div>
                                    <div><strong>Escolaridad:</strong> ${h.motherEducation || '—'}</div>
                                    <div><strong>Ocupación Actual:</strong> ${h.motherJob || '—'}</div>
                                    <div><strong>Domicilio:</strong> ${h.motherAddress || '—'}</div>
                                </div>
                            </div>
                            <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--border-secondary);">
                                <h5 style="margin-top:0;font-weight:700;"><i class="fas fa-male" style="color:#0284c7;"></i> Padre</h5>
                                <div style="font-size:13px;line-height:1.5;">
                                    <div><strong>Nombre Completo:</strong> ${h.fatherName || '—'}</div>
                                    <div><strong>Edad:</strong> ${h.fatherAge ? h.fatherAge + ' años' : '—'} · <strong>C.I:</strong> ${h.fatherCI || '—'}</div>
                                    <div><strong>Escolaridad:</strong> ${h.fatherEducation || '—'}</div>
                                    <div><strong>Ocupación Actual:</strong> ${h.fatherJob || '—'}</div>
                                    <div><strong>Domicilio:</strong> ${h.fatherAddress || '—'}</div>
                                </div>
                            </div>
                        </div>

                        <div style="background:var(--bg-secondary);padding:10px 14px;border-radius:8px;margin-bottom:14px;display:flex;justify-content:space-around;flex-wrap:wrap;gap:10px;font-size:13px;">
                            <div><strong>Nº Hermanos:</strong> ${h.siblingsCount ?? 0}</div>
                            <div><strong>Nº Hermanastros:</strong> ${h.stepSiblingsCount ?? 0}</div>
                            <div><strong>Nº Medio Hermanos:</strong> ${h.halfSiblingsCount ?? 0}</div>
                        </div>

                        <div style="padding: 10px 14px; background: rgba(45, 212, 191, 0.08); border-radius: 8px; border: 1px solid rgba(45, 212, 191, 0.25);">
                            <strong>Consentimiento Informado:</strong> 
                            ${h.guardianConsent === 'firmado' ? '<span style="color:#059669; font-weight:600;"><i class="fas fa-check-circle"></i> Firmado por Representante Legal y en custodia clínica</span>' : '<span style="color:#d97706; font-weight:600;"><i class="fas fa-clock"></i> Pendiente de firma y ratificación</span>'}
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 2: MOTIVO DE CONSULTA & EXAMEN MENTAL -->
                <div class="hist-acc-item active" id="acc_sec_2">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_2')">
                        <div class="hist-acc-title">
                            <span class="acc-num">2</span>
                            <strong>👁️ Motivo de Consulta & Examen Mental</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-field-block">
                            <label>Motivo de Consulta:</label>
                            <p>${patient.reason || 'Sin motivo explicitado aún.'}</p>
                        </div>
                        <div class="hist-field-block">
                            <label>Gestualidad Observada al Momento de Explicar el Motivo de Consulta:</label>
                            <p>${h.observedGestures || 'Expresión facial y lenguaje corporal acordes al relato.'}</p>
                        </div>
                        <div class="hist-field-block">
                            <label>Sintomatología Presentada:</label>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:10px;margin-top:6px;">
                                <div style="background:var(--bg-secondary);padding:10px;border-radius:6px;">
                                    <strong>Conductual:</strong> ${h.symptomsBehavioral || 'Sin alteraciones psicomotrices agudas'}
                                </div>
                                <div style="background:var(--bg-secondary);padding:10px;border-radius:6px;">
                                    <strong>Emocional:</strong> ${h.symptomsEmotional || 'Resonancia afectiva acorde a la edad'}
                                </div>
                                <div style="background:var(--bg-secondary);padding:10px;border-radius:6px;">
                                    <strong>Orgánica:</strong> ${h.symptomsOrganic || 'Sin compromiso somático referido'}
                                </div>
                            </div>
                        </div>
                        <div class="hist-field-block" style="margin-top:14px;">
                            <label>Examen Mental:</label>
                            <p>${h.mentalExam || 'Atento, colaborador, lenguaje fluido, orientado en tiempo, espacio y persona, afecto modulado.'}</p>
                        </div>

                        <!-- HIPÓTESIS BIOPSICOSOCIALES Y FACTORES (TC-CHILD-01) -->
                        <div class="hist-sub-heading" style="margin-top:18px;">💡 Formulación Clínica e Hipótesis Biopsicosociales</div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:12px;margin-bottom:12px;">
                            <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;border-left:4px solid #10b981;">
                                <div style="font-weight:700;font-size:12px;color:var(--text-secondary);text-transform:uppercase;">Hipótesis Biológica</div>
                                <div style="font-size:13px;margin-top:4px;">${patient.bioHypothesis || h.bioHypothesis || 'Desarrollo neurológico y madurativo acorde a edad cronológica.'}</div>
                            </div>
                            <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;border-left:4px solid #6366f1;">
                                <div style="font-weight:700;font-size:12px;color:var(--text-secondary);text-transform:uppercase;">Hipótesis Psicológica</div>
                                <div style="font-size:13px;margin-top:4px;">${patient.psychHypothesis || h.psychHypothesis || 'Mecanismos de regulación emocional e interacción afectiva en consolidación.'}</div>
                            </div>
                            <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;border-left:4px solid #f59e0b;">
                                <div style="font-weight:700;font-size:12px;color:var(--text-secondary);text-transform:uppercase;">Hipótesis Social</div>
                                <div style="font-size:13px;margin-top:4px;">${patient.socialHypothesis || h.socialHypothesis || 'Entorno familiar y escolar protector con redes de apoyo activas.'}</div>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:10px;">
                            <div style="background:var(--bg-secondary);padding:10px;border-radius:6px;font-size:12.5px;">
                                <span style="color:#ef4444;font-weight:700;">Factores de Riesgo:</span> ${patient.riskFactors || h.riskFactors || 'No se aprecian factores de riesgo agudo.'}
                            </div>
                            <div style="background:var(--bg-secondary);padding:10px;border-radius:6px;font-size:12.5px;">
                                <span style="color:#f59e0b;font-weight:700;">Factores de Vulnerabilidad:</span> ${patient.vulnerabilityFactors || h.vulnerabilityFactors || 'Sensibilidad a la frustración o cambios.'}
                            </div>
                            <div style="background:var(--bg-secondary);padding:10px;border-radius:6px;font-size:12.5px;">
                                <span style="color:#10b981;font-weight:700;">Factores Protectores:</span> ${patient.protectiveFactors || h.protectiveFactors || 'Buena vinculación afectiva y soporte parental.'}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 3: ANTECEDENTES MÉDICOS, PSIQUIÁTRICOS Y PEDAGÓGICOS -->
                <div class="hist-acc-item active" id="acc_sec_3">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_3')">
                        <div class="hist-acc-title">
                            <span class="acc-num">3</span>
                            <strong>🏥 Antecedentes Médicos, Psiquiátricos y Pedagógicos</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <table class="hist-medical-table">
                            <thead>
                                <tr><th style="width:40%;">Eje de Antecedente Médico</th><th>Detalle Clínico Registrado</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Evaluación Neurológica previa</td><td>${h.neuroEvaluation || 'No realizada / Negativa'}</td></tr>
                                <tr><td>Golpes, caídas, lesiones, esguinces o fracturas</td><td>${h.traumaInjuries || 'Sin antecedentes traumáticos de consideración'}</td></tr>
                                <tr><td>Operaciones</td><td>${h.surgeries || 'Ninguna'}</td></tr>
                                <tr><td>Convulsiones</td><td>${h.seizures || 'Negativo'}</td></tr>
                                <tr><td>Enfermedades que afectan el Sistema Inmunológico</td><td>${h.immuneDiseases || 'Ninguna'}</td></tr>
                                <tr><td>Alergias</td><td>${h.allergies || 'No refiere'}</td></tr>
                                <tr><td>Tratamiento Actual</td><td>${h.medicalTreatment || 'Sin medicación prescrita'}</td></tr>
                                <tr><td>Otros antecedentes médicos</td><td>${h.otherMedicalHistory || 'Sin otros antecedentes reportados'}</td></tr>
                                <tr><td>Antecedentes Médicos Familiares</td><td>${h.familyMedicalHistory || 'No refiere patologías crónicas de relevancia'}</td></tr>
                                <tr><td>Antecedentes Psiquiátricos del Paciente</td><td>${h.patientPsychiatricHistory || 'Sin atenciones psiquiátricas previas'}</td></tr>
                                <tr><td>Antecedentes Psiquiátricos Familiares</td><td>${h.familyPsychiatricHistory || 'No refiere patologías psiquiátricas familiares'}</td></tr>
                                <tr><td>Evaluación o Tratamiento Pedagógico Previo</td><td>${h.pedagogicalHistory || 'Sin evaluaciones psicopedagógicas previas'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SECCIÓN 4: NEURODESARROLLO PRENATAL, PARTO, HITOS Y ESCOLARIDAD -->
                <div class="hist-acc-item active" id="acc_sec_4">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_4')">
                        <div class="hist-acc-title">
                            <span class="acc-num">4</span>
                            <strong>🌱 Neurodesarrollo Prenatal, Parto, Hitos y Escolaridad</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-sub-heading" style="margin-top:0;">Desarrollo Prenatal & Gestación</div>
                        <div class="hist-grid-data">
                            <div><strong>Embarazo Deseado:</strong> ${h.pregnancyDesired}</div>
                            <div><strong>Embarazo Planificado:</strong> ${h.pregnancyPlanned}</div>
                            <div><strong>Nº de Embarazo de la Madre:</strong> ${h.pregnancyNumber}</div>
                            <div style="grid-column:span 2;"><strong>Desarrollo del feto durante embarazo:</strong> ${h.fetalDevelopment || 'Evolución intrauterina normal'}</div>
                            <div style="grid-column:span 2;"><strong>Estado emocional materno durante embarazo:</strong> ${h.motherEmotionalState || 'Tranquilo, sin duelos ni eventos traumáticos'}</div>
                            <div><strong>Medicación durante embarazo:</strong> ${h.pregnancyMedication || 'Vitaminas y ácido fólico'}</div>
                            <div><strong>Enfermedades maternas durante embarazo:</strong> ${h.pregnancyDiseases || 'Ninguna'}</div>
                        </div>

                        <div class="hist-sub-heading">Datos del Parto & Estado al Nacer</div>
                        <div class="hist-grid-data">
                            <div><strong>Duración del Embarazo:</strong> ${h.pregnancyDuration}</div>
                            <div><strong>Duración del Parto:</strong> ${h.deliveryDuration || 'Sin complicaciones'}</div>
                            <div><strong>Tipo de Parto:</strong> ${h.deliveryType}</div>
                            <div><strong>Llanto al Nacer:</strong> ${h.birthCry}</div>
                            <div><strong>Posición del Bebé:</strong> ${h.babyPosition}</div>
                            <div><strong>Peso:</strong> ${h.birthWeight || '3.200 kg'} · <strong>Medida:</strong> ${h.birthLength || '50 cm'}</div>
                            <div><strong>Reanimación:</strong> ${h.resuscitation}</div>
                            <div><strong>Incubadora:</strong> ${h.incubator}</div>
                            <div><strong>Primera Alimentación:</strong> ${h.firstFeeding || 'Lactancia materna'}</div>
                            <div style="grid-column:span 2;"><strong>Observaciones del Nacimiento:</strong> ${h.birthObservations || 'Apgar normal, sin cianosis ni hipoxia'}</div>
                        </div>

                        <div class="hist-sub-heading">Hitos del Neurodesarrollo (Primeros Años)</div>
                        <div class="hist-grid-data">
                            <div><strong>Alimentación Primeros Meses:</strong> ${h.earlyFeedingDesc || 'Lactancia adecuada'}</div>
                            <div><strong>Proceso de Destete:</strong> ${h.weaningDesc || 'Transición favorable a sólidos'}</div>
                            <div><strong>Control Cefálico:</strong> ${h.headControl || '3 meses'}</div>
                            <div><strong>Sedestación (Sentado):</strong> ${h.sittingAge || '6 meses'}</div>
                            <div><strong>Gateo:</strong> ${h.crawlingAge || '8 meses'}</div>
                            <div><strong>Primeros Pasos:</strong> ${h.firstStepsAge || '12 meses'}</div>
                            <div><strong>Primeras Palabras:</strong> ${h.firstWordsAge || '10 meses'}</div>
                            <div><strong>Primeros Dientes:</strong> ${h.firstTeeth || '6 meses'}</div>
                            <div><strong>Control de Esfínteres:</strong> ${h.sphincterControl || '2.5 años'}</div>
                        </div>

                        <div class="hist-sub-heading">Área Escolar & Pedagógica</div>
                        <div class="hist-grid-data">
                            <div><strong>Guardería o Cuidadores:</strong> ${h.daycareOrCaregivers || 'Cuidado maternal en el hogar'}</div>
                            <div><strong>Edad de Inicio Escolar:</strong> ${h.schoolStartAge || '3 años'}</div>
                            <div><strong>Edad Lectura:</strong> ${h.readingAge || '5 años'} · <strong>Escritura:</strong> ${h.writingAge || '6 años'} · <strong>Conteo:</strong> ${h.countingAge || '4 años'}</div>
                            <div style="grid-column:span 2;"><strong>Adaptación Escolar:</strong> ${h.schoolAdaptation || 'Adaptación favorable, sin ansiedad por separación'}</div>
                            <div><strong>Relación con Maestras:</strong> ${h.teacherRelation || 'Respetuosa y colaboradora'}</div>
                            <div><strong>Amigos e Interacción Escolar:</strong> ${h.schoolFriends || 'Integración social fluida y participativa'}</div>
                            <div style="grid-column:span 2;"><strong>Desarrollo en Primaria:</strong> ${h.elementaryDevelopment || 'Evolución académica satisfactoria'}</div>
                            <div><strong>Áreas con Mayor Dificultad:</strong> ${h.learningDifficulties || 'Ninguna de consideración'}</div>
                            <div><strong>Áreas con Mayor Facilidad:</strong> ${h.learningStrengths || 'Creatividad, lenguaje y expresión plástica'}</div>
                            <div><strong>Conducta en el Colegio:</strong> ${h.schoolBehavior || 'Acorde a normas y encuadre del aula'}</div>
                            <div><strong>Actitud al Realizar Actividades:</strong> ${h.taskAttitude || 'Participativa y motivada'}</div>
                            <div style="grid-column:span 2;"><strong>Apoyo Escolar en Hogar:</strong> ${h.homeworkSupport || 'Madre / Padre acompañan las actividades escolares'}</div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 5: DINÁMICA FAMILIAR, SOCIAL Y VIVIENDA -->
                <div class="hist-acc-item active" id="acc_sec_5">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_5')">
                        <div class="hist-acc-title">
                            <span class="acc-num">5</span>
                            <strong>🏡 Dinámica Familiar, Social y Vivienda</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-sub-heading" style="margin-top:0;">Dinámica Familiar y Social</div>
                        <div class="hist-grid-data">
                            <div><strong>Conducta en el Hogar:</strong> ${h.homeBehavior || 'Tranquilo y colaborador con las rutinas'}</div>
                            <div><strong>Conducta al Salir de Casa:</strong> ${h.outdoorsBehavior || 'Adecuada autorregulación y curiosidad sana'}</div>
                            <div><strong>Cosas que le Gustan:</strong> ${h.likes || 'Juegos de mesa, dibujar, cuentos infantiles'}</div>
                            <div><strong>Cosas que le Disgustan:</strong> ${h.dislikes || 'Discusiones, ruidos intensos, tareas impuestas'}</div>
                            <div><strong>Autonomía en Autocuidado:</strong> ${h.autonomy || 'Habilidades de autocuidado consolidadas acorde a su edad'}</div>
                            <div style="grid-column:span 2;"><strong>Dinámica Familiar:</strong> ${h.familyDynamics || 'Clima afectivo contenedor y pautas de crianza coordinadas'}</div>
                            <div style="grid-column:span 2;"><strong>Área Social:</strong> ${h.socialArea || 'Vínculos afectivos sanos con pares, primos y compañeros'}</div>
                        </div>

                        <div class="hist-sub-heading">Áreas del Desarrollo (Pág. 6)</div>
                        <div class="hist-grid-data">
                            <div style="grid-column:span 2;"><strong>Sexualidad:</strong> ${h.sexuality || 'Curiosidad infantil normal acorde a la etapa evolutiva'}</div>
                            <div style="grid-column:span 2;"><strong>Área Espiritual:</strong> ${h.spirituality || 'Entorno formativo en valores humanos y éticos'}</div>
                        </div>

                        <div class="hist-sub-heading">Área de Vivienda & Censo Habitacional</div>
                        <div class="hist-grid-data">
                            <div><strong>Tipo de Vivienda:</strong> ${h.housingType || 'Casa'}</div>
                            <div><strong>Servicios Básicos:</strong> ${h.housingServices || 'Sí'}</div>
                            <div><strong>Comparte Habitación:</strong> ${h.housingSharesRoom || 'No'} ${h.housingSharesRoomDesc ? `(${h.housingSharesRoomDesc})` : ''}</div>
                            <div style="grid-column:span 2;">
                                <strong>Convivientes en Hogar:</strong> Adultos: ${h.occupantsAdultsF ?? 0}F / ${h.occupantsAdultsM ?? 0}M · Adolescentes: ${h.occupantsTeensF ?? 0}F / ${h.occupantsTeensM ?? 0}M · Niños: ${h.occupantsChildrenF ?? 0}F / ${h.occupantsChildrenM ?? 0}M
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 6: HÁBITOS PSICOBIOLÓGICOS -->
                <div class="hist-acc-item active" id="acc_sec_6">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_6')">
                        <div class="hist-acc-title">
                            <span class="acc-num">6</span>
                            <strong>⚡ Hábitos Psicobiológicos</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <table class="hist-medical-table">
                            <thead><tr><th style="width:40%;">Hábito / Indicador</th><th>Observación Clínica</th></tr></thead>
                            <tbody>
                                <tr><td>Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.)</td><td>${h.addictions || 'Niega sustancias; uso controlado de pantallas bajo supervisión'}</td></tr>
                                <tr><td>Manías Sociales (Tics, rutinas que maneje en un determinado espacio)</td><td>${h.socialManias || 'Sin tics ni rituales compulsivos'}</td></tr>
                                <tr><td>Fobias o Miedo Intenso</td><td>${h.phobias || 'Sin fobias invalidantes; temores evolutivos habituales'}</td></tr>
                                <tr><td>Miedos Nocturnos</td><td>${h.nightTerrors || 'Niega terrores nocturnos; descanso reparador'}</td></tr>
                                <tr><td>Ornicofagia</td><td>${h.ornicofagia || h.onychophagy || 'No observada / Negada'}</td></tr>
                                <tr><td>Sueño</td><td>${h.sleepPattern || 'Patrón de sueño reparador de 9-10 horas promedio'}</td></tr>
                                <tr><td>Alimentación</td><td>${h.eatingPattern || 'Apetito conservado, dieta balanceada'}</td></tr>
                                <tr><td>Higiene</td><td>${h.hygienePattern || 'Hábitos de higiene y aseo personal adecuados'}</td></tr>
                                <tr><td>Área Recreacional</td><td>${h.recreationArea || 'Actividades lúdicas compartidas, juegos al aire libre'}</td></tr>
                                <tr><td>Rutina Diaria</td><td>${h.dailyRoutine || 'Rutina estructurada con horarios regulares para estudio, juego y descanso'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SECCIÓN 7: METAS Y PROYECTO DE VIDA -->
                <div class="hist-acc-item active" id="acc_sec_7">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_7')">
                        <div class="hist-acc-title">
                            <span class="acc-num">7</span>
                            <strong>🎯 Metas y Proyecto de Vida</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-field-block">
                            <label>Metas a Corto y Mediano Plazo:</label>
                            <p>${h.shortTermGoals || h.mediumTermGoals || 'Fortalecer autorregulación emocional, hábitos escolares y habilidades sociales.'}</p>
                        </div>
                        <div class="hist-field-block">
                            <label>Metas a Largo Plazo:</label>
                            <p>${h.longTermGoals || 'Desarrollo madurativo integral, autonomía y bienestar psicoemocional sostenido.'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
                    <button class="btn-primary" onclick="ClinicalHistorySystem.openFullHistoryEditor('${patient.id}')">
                        <i class="fas fa-edit"></i> Editar Historia Completa
                    </button>
                    <button class="btn-secondary" onclick="if(typeof editPatient==='function'){editPatient('${patient.id}'); closeModal('patientDetailModal');}">
                        <i class="fas fa-user-edit"></i> Ficha Básica
                    </button>
                    <button class="btn-secondary" onclick="ClinicalHistorySystem.openGenogramModal('${patient.id}')">
                        <i class="fas fa-sitemap"></i> Genograma
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
                        <div style="background:var(--bg-secondary);padding:10px 14px;border-radius:8px;margin-bottom:14px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:13px;">
                            <div><strong>Ha asistido antes a Consulta Psicológica:</strong> <span class="tag tag-sm ${h.hasAttendedBefore === 'SI' ? 'tag-primary' : 'tag-neutral'}">${h.hasAttendedBefore === 'SI' ? 'SÍ' : 'NO'}</span></div>
                            <div><strong>Fecha:</strong> ${h.previousAttendanceDate || '—'}</div>
                        </div>
                        <div class="hist-grid-data">
                            <div><strong>Nombre Completo:</strong> ${patient.name || 'Sin registrar'}</div>
                            <div><strong>Lugar y Fecha de Nacimiento:</strong> ${h.birthPlace ? h.birthPlace + ' · ' : ''}${patient.birthdate ? patient.birthdate.split('-').reverse().join('/') : '—'}</div>
                            <div><strong>Edad:</strong> ${h.age ? `${h.age} años` : (patient.birthdate && typeof calculateAge === 'function' ? `${calculateAge(patient.birthdate)} años` : 'No registrada')}</div>
                            <div><strong>Sexo:</strong> ${patient.gender || 'No registrado'}</div>
                            <div><strong>Escolaridad:</strong> ${patient.schoolGrade || h.schoolGrade || 'No registrado'}</div>
                            <div><strong>Vive con:</strong> ${h.livesWith || 'No especificado'}</div>
                            <div style="grid-column: span 2;"><strong>Domicilio:</strong> ${h.address || patient.address || 'No registrado'}</div>
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
                        <div class="hist-sub-heading" style="margin-top:0;">DATOS FILIATORIOS:</div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;margin-bottom:14px;">
                            <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--border-secondary);">
                                <h5 style="margin-top:0;font-weight:700;"><i class="fas fa-female" style="color:#db2777;"></i> Madre</h5>
                                <div style="font-size:13px;line-height:1.5;">
                                    <div><strong>Nombre Completo:</strong> ${h.motherName || '—'}</div>
                                    <div><strong>Edad:</strong> ${h.motherAge ? h.motherAge + ' años' : '—'} · <strong>C.I:</strong> ${h.motherCI || '—'}</div>
                                    <div><strong>Escolaridad:</strong> ${h.motherEducation || '—'}</div>
                                    <div><strong>Ocupación:</strong> ${h.motherJob || '—'}</div>
                                    <div><strong>Domicilio:</strong> ${h.motherAddress || '—'}</div>
                                </div>
                            </div>
                            <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--border-secondary);">
                                <h5 style="margin-top:0;font-weight:700;"><i class="fas fa-male" style="color:#0284c7;"></i> Padre</h5>
                                <div style="font-size:13px;line-height:1.5;">
                                    <div><strong>Nombre Completo:</strong> ${h.fatherName || '—'}</div>
                                    <div><strong>Edad:</strong> ${h.fatherAge ? h.fatherAge + ' años' : '—'} · <strong>C.I:</strong> ${h.fatherCI || '—'}</div>
                                    <div><strong>Escolaridad:</strong> ${h.fatherEducation || '—'}</div>
                                    <div><strong>Ocupación:</strong> ${h.fatherJob || '—'}</div>
                                    <div><strong>Domicilio:</strong> ${h.fatherAddress || '—'}</div>
                                </div>
                            </div>
                        </div>

                        <div style="background:var(--bg-secondary);padding:10px 14px;border-radius:8px;margin-bottom:14px;display:flex;justify-content:space-around;flex-wrap:wrap;gap:10px;font-size:13px;">
                            <div><strong>Nº Hermanos:</strong> ${h.siblingsCount ?? 0}</div>
                            <div><strong>Nº Hermanastros:</strong> ${h.stepSiblingsCount ?? 0}</div>
                            <div><strong>Nº Medio Hermanos:</strong> ${h.halfSiblingsCount ?? 0}</div>
                        </div>

                        <div style="padding: 10px 14px; background: rgba(45, 212, 191, 0.08); border-radius: 8px; border: 1px solid rgba(45, 212, 191, 0.25);">
                            <strong>Consentimiento Informado:</strong> 
                            ${h.guardianConsent === 'firmado' ? '<span style="color:#059669; font-weight:600;"><i class="fas fa-check-circle"></i> Firmado por Representante Legal y en custodia clínica</span>' : '<span style="color:#d97706; font-weight:600;"><i class="fas fa-clock"></i> Pendiente de firma y ratificación</span>'}
                            <div style="margin-top:6px;font-size:12px;color:var(--text-secondary);">
                                <i class="fas fa-hand-holding-heart" style="color:var(--accent-primary);"></i> <strong>Asentimiento Informado del Adolescente (LOPNNA Art. 80):</strong> Consignado en alianza terapéutica y proceso de escucha activa.
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
                        <div class="hist-field-block">
                            <label><i class="fas fa-comment-medical"></i> MOTIVO DE CONSULTA:</label>
                            <p style="white-space:pre-line;">${patient.reason || 'Sin motivo explicitado aún.'}</p>
                        </div>

                        <div class="hist-field-block" style="margin-top:10px;">
                            <label><i class="fas fa-eye"></i> GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICAR EL MOTIVO DE CONSULTA:</label>
                            <p style="white-space:pre-line;">${h.observedGestures || 'Sin observaciones registradas.'}</p>
                        </div>

                        <div class="hist-field-block" style="margin-top:10px;">
                            <label><i class="fas fa-sitemap"></i> GENOGRAMA:</label>
                            <p style="white-space:pre-line;">${h.genogramNotes || 'Diagrama y notas registradas en expediente digital.'}</p>
                        </div>

                        <!-- Hipótesis Biopsicosociales -->
                        <div class="hist-sub-heading" style="margin-top:16px;"><i class="fas fa-brain"></i> Hipótesis Biopsicosociales</div>
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

                        <!-- Tríada de Factores -->
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
                                <div style="font-weight:700;color:#059669;font-size:12.5px;margin-bottom:6px;"><i class="fas fa-shield-check"></i> Factores de Protección</div>
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
                            <div><strong>Turno: <strong>${h.shift || 'No definido'}</strong></strong></div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 5: EXAMEN MENTAL & TRÍADA SINTOMATOLÓGICA -->
                <div class="hist-acc-item active" id="acc_teen_5">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_teen_5')">
                        <div class="hist-acc-title">
                            <span class="acc-num">5</span>
                            <strong>🧠 Examen Mental & Tríada Sintomatológica</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-field-block">
                            <label>Examen Mental Semiología del Adolescente (Porte, Conciencia, Afecto, Pensamiento, Sensopercepción, Juicio):</label>
                            <p>${h.mentalExam || 'Adolescente orientado témporo-espacialmente. Adecuado contacto ocular, lenguaje fluido y coherente, afecto modulado. Juicio de realidad conservado, introspección acorde a su edad cronológica.'}</p>
                        </div>
                        <div class="hist-field-block" style="margin: 10px 0; background: var(--bg-secondary); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-secondary);">
                            <label style="font-weight:700; color:var(--text-primary);"><i class="fas fa-stethoscope"></i> Ejes Semiológicos del Examen Mental:</label>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:8px; font-size:12.5px; margin-top:6px;">
                                <div><strong>Orientación / Conciencia:</strong> ${h.mentalOrientation || 'Orientado en las tres esferas'}</div>
                                <div><strong>Atención y Memoria:</strong> ${h.mentalAttention || 'Euprosexia y fijación conservada'}</div>
                                <div><strong>Pensamiento:</strong> ${h.mentalThought || 'Curso lógico, coherente, sin delirios'}</div>
                                <div><strong>Afecto / Ánimo:</strong> ${h.mentalAffect || 'Eutimia, resonancia afectiva modulada'}</div>
                                <div><strong>Juicio e Insight:</strong> ${h.mentalJudgment || 'Juicio de realidad conservado'}</div>
                                <div><strong>Riesgo Autolítico:</strong> <span class="tag tag-sm ${h.mentalSuicidalRisk && h.mentalSuicidalRisk.includes('Descartado') ? 'tag-success' : 'tag-neutral'}">${h.mentalSuicidalRisk || 'Descartado / Negativo en exploración'}</span></div>
                            </div>
                        </div>
                        <div class="symptom-triad-grid">
                            <div class="triad-card">
                                <h6>🏃 Características Conductuales</h6>
                                <p>${h.symptomsBehavioral || 'Sin reporte conductual adverso'}</p>
                            </div>
                            <div class="triad-card">
                                <h6>🎭 Características Emocionales</h6>
                                <p>${h.symptomsEmotional || 'Sin desborde emocional'}</p>
                            </div>
                            <div class="triad-card">
                                <h6>🫀 Características Orgánicas / Somáticas</h6>
                                <p>${h.symptomsOrganic || 'Sin quejas somáticas agudas'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 6: ANTECEDENTES MÉDICOS Y NEUROLÓGICOS -->
                <div class="hist-acc-item active" id="acc_teen_6">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_teen_6')">
                        <div class="hist-acc-title">
                            <span class="acc-num">6</span>
                            <strong>🩺 Antecedentes Médicos, Neurológicos & Quirúrgicos</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <table class="hist-table-medical">
                            <tr><th colspan="2" style="background:var(--bg-secondary);text-align:left;">Antecedentes Médicos del Paciente</th></tr>
                            <tr><td style="width:40%;">Evaluación Neurológica</td><td>${h.neuroEvaluation || 'No referida / Negativa'}</td></tr>
                            <tr><td>Golpes, caídas, lesiones, esguinces o fracturas.</td><td>${h.traumaInjuries || 'Sin antecedentes traumáticos'}</td></tr>
                            <tr><td>Operaciones</td><td>${h.surgeries || 'Ninguna'}</td></tr>
                            <tr><td>Convulsiones</td><td>${h.seizures || 'Negativo'}</td></tr>
                            <tr><td>Enfermedades que afectan el Sistema Inmunológico</td><td>${h.immuneDiseases || 'Ninguna'}</td></tr>
                            <tr><td>Alergias</td><td>${h.allergies || 'No refiere'}</td></tr>
                            <tr><td>Tratamiento Actual</td><td>${h.medicalTreatment || patient.medication || 'Sin medicación prescrita'}</td></tr>
                            <tr><td>Otros antecedentes</td><td>${h.otherMedicalHistory || 'Ninguno'}</td></tr>
                            <tr><th colspan="2" style="background:var(--bg-secondary);text-align:left;">Antecedentes Médicos Familiares</th></tr>
                            <tr><td colspan="2">${h.familyMedicalHistory || patient.familyHistory || 'No especificados'}</td></tr>
                            <tr><th colspan="2" style="background:var(--bg-secondary);text-align:left;">Antecedentes Psiquiátricos o psicológicos del Paciente</th></tr>
                            <tr><td colspan="2">${h.patientPsychiatricHistory || 'Sin diagnósticos ni tratamientos previos'}</td></tr>
                            <tr><th colspan="2" style="background:var(--bg-secondary);text-align:left;">Antecedentes Psiquiátricos o psicológicos Familiares</th></tr>
                            <tr><td colspan="2">${h.familyPsychiatricHistory || 'No refiere'}</td></tr>
                            <tr><th colspan="2" style="background:var(--bg-secondary);text-align:left;">Evaluación o tratamiento Pedagógico Previo del Paciente</th></tr>
                            <tr><td colspan="2">${h.pedagogicalHistory || 'Sin evaluación pedagógica previa'}</td></tr>
                        </table>
                    </div>
                </div>

                <!-- SECCIÓN 6.1: DESARROLLO PRENATAL, PARTO E HITOS -->
                <div class="hist-acc-item active" id="acc_teen_perinatal">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_teen_perinatal')">
                        <div class="hist-acc-title">
                            <span class="acc-num"><i class="fas fa-baby" style="font-size:12px;"></i></span>
                            <strong>🍼 Desarrollo Prenatal, Parto e Hitos (Primeros Años de Vida)</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-sub-heading" style="margin-top:0;">DESARROLLO PRENATAL:</div>
                        <div class="hist-grid-data" style="margin-bottom:12px;">
                            <div><strong>Embarazo Deseado:</strong> <span class="tag tag-sm">${h.pregnancyDesired || 'SI'}</span></div>
                            <div><strong>Embarazo Planificado:</strong> <span class="tag tag-sm">${h.pregnancyPlanned || 'SI'}</span></div>
                            <div style="grid-column: span 2;"><strong>Desarrollo del feto durante el embarazo:</strong> ${h.fetalDevelopment || 'Adecuado, sin complicaciones'}</div>
                            <div style="grid-column: span 2;"><strong>Estado emocional de la madre durante el embarazo:</strong> ${h.motherEmotionalState || 'Tranquilo / Estable'}</div>
                            <div><strong>Medicación Durante el Embarazo:</strong> ${h.pregnancyMedication || 'Suplementos vitamínicos prenatales'}</div>
                            <div><strong>Enfermedades de la Madre Durante el Embarazo:</strong> ${h.pregnancyDiseases || 'Ninguna'}</div>
                            <div><strong>Número de Embarazo de la Madre:</strong> ${h.pregnancyNumber || '1'}</div>
                        </div>

                        <div class="hist-sub-heading">DATOS DEL PARTO Y ESTADO DEL NIÑO AL NACER:</div>
                        <div class="hist-grid-data" style="margin-bottom:12px;">
                            <div><strong>Duración del Embarazo:</strong> ${h.pregnancyDuration || 'A término'}</div>
                            <div><strong>Duración del Parto:</strong> ${h.deliveryDuration || 'Normal'}</div>
                            <div><strong>Tipo de Parto:</strong> <span class="tag tag-sm tag-primary">${h.deliveryType || 'Natural'}</span></div>
                            <div><strong>Llanto al nacer:</strong> ${h.birthCry || 'SI'}</div>
                            <div><strong>Posición del Bebé:</strong> ${h.babyPosition || 'Cefálica'}</div>
                            <div><strong>Peso y Medida:</strong> ${h.birthWeight ? `${h.birthWeight}` : '—'} / ${h.birthLength ? `${h.birthLength}` : '—'}</div>
                            <div><strong>Reanimación:</strong> ${h.resuscitation || 'NO'} · <strong>Incubadora:</strong> ${h.incubator || 'NO'}</div>
                            <div style="grid-column: span 2;"><strong>Primera alimentación:</strong> ${h.firstFeeding || 'Lactancia materna'}</div>
                            ${h.birthObservations ? `<div style="grid-column: span 2;"><strong>Otras Observaciones:</strong> ${h.birthObservations}</div>` : ''}
                        </div>

                        <div class="hist-sub-heading">DESARROLLO SOCIAL Y PSICOMOTOR ALREDEDOR DE LOS PRIMEROS AÑOS DE VIDA:</div>
                        <table class="hist-table-medical">
                            <tr><td style="width:40%;">Descripción de la alimentación en primeros meses</td><td>${h.earlyFeedingDesc || 'Lactancia materna exclusiva / acorde a edad'}</td></tr>
                            <tr><td>Descripción del proceso de destete</td><td>${h.weaningDesc || 'Gradual, sin dificultades'}</td></tr>
                            <tr><td>Control o dureza cefálica</td><td>${h.headControl || 'Normal (aprox. 3 meses)'}</td></tr>
                            <tr><td>Edad a la que se sentó por primera vez</td><td>${h.sittingAge || 'Aprox. 6 meses'}</td></tr>
                            <tr><td>Gatear</td><td>${h.crawlingAge || 'Aprox. 8-9 meses'}</td></tr>
                            <tr><td>Primeros pasos</td><td>${h.firstStepsAge || 'Aprox. 12 meses'}</td></tr>
                            <tr><td>Primeras palabras</td><td>${h.firstWordsAge || 'Aprox. 12-14 meses'}</td></tr>
                            <tr><td>Primero dientes</td><td>${h.firstTeeth || 'Aprox. 6-8 meses'}</td></tr>
                            <tr><td>Control de esfínteres vesical y anal</td><td>${h.sphincterControl || 'Alcanzado a los 2-3 años'}</td></tr>
                        </table>
                    </div>
                </div>

                <!-- SECCIÓN 7: ÁREA ESCOLAR, ACADÉMICA & APRENDIZAJE -->
                <div class="hist-acc-item active" id="acc_teen_7">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_teen_7')">
                        <div class="hist-acc-title">
                            <span class="acc-num">7</span>
                            <strong>🏫 Área Escolar, Académica & Dinámica de Aprendizaje</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-sub-heading" style="margin-top:0;">ESCOLARIDAD:</div>
                        <table class="hist-table-medical">
                            <tr><td style="width:40%;">Guardería o cuidadores</td><td>${h.daycareOrCaregivers || 'Cuidado materno/familiar'}</td></tr>
                            <tr><td>Edad a la que comenzó la escolaridad</td><td>${h.schoolStartAge || 'Aprox. 3-4 años'}</td></tr>
                            <tr><td>Proceso de adaptación a la escolaridad</td><td>${h.schoolAdaptation || 'Favorable, sin ansiedad de separación marcada'}</td></tr>
                            <tr><td>Relación con las maestras</td><td>${h.teacherRelation || 'Respetuosa y adecuada'}</td></tr>
                            <tr><td>Amigos e interacción en la escuela</td><td>${h.schoolFriends || 'Sociable, integrado con sus compañeros'}</td></tr>
                            <tr><td>Edad a la que aprendió a leer</td><td>${h.readingAge || 'Aprox. 5-6 años'}</td></tr>
                            <tr><td>Edad a la que aprendió a escribir</td><td>${h.writingAge || 'Aprox. 5-6 años'}</td></tr>
                            <tr><td>Edad a la que aprendió a contar</td><td>${h.countingAge || 'Aprox. 4-5 años'}</td></tr>
                            <tr><td>Desarrollo en la primaria</td><td>${h.elementaryDevelopment || 'Rendimiento general satisfactorio'}</td></tr>
                            <tr><td>Áreas con mayor dificultad para su aprendizaje</td><td>${h.learningDifficulties || 'Ninguna dificultad severa'}</td></tr>
                            <tr><td>Áreas con mayor facilidad para su aprendizaje</td><td>${h.learningStrengths || 'Creatividad, razonamiento, memoria'}</td></tr>
                            <tr><td>Conducta en el colegio</td><td>${h.schoolBehavior || 'Acorde al encuadre escolar'}</td></tr>
                            <tr><td>Actitud al realizar actividades</td><td>${h.taskAttitude || 'Participativa y colaboradora'}</td></tr>
                            <tr><td>Personas con quien realizar actividades escolares en el hogar</td><td>${h.homeworkSupport || 'Autónomo con supervisión parental'}</td></tr>
                        </table>

                        <div class="hist-sub-heading" style="margin-top:16px;">DINÁMICA FAMILIAR Y SOCIAL:</div>
                        <table class="hist-table-medical">
                            <tr><td style="width:40%;">Conducta en el Hogar</td><td>${h.homeBehavior || 'Tranquilo(a), colaborativo(a)'}</td></tr>
                            <tr><td>Conducta al Salir de Casa</td><td>${h.outdoorsBehavior || 'Adecuada, sociable'}</td></tr>
                            <tr><td>Cosas que le gusta</td><td>${h.likes || 'Música, deportes, lectura, videojuegos'}</td></tr>
                            <tr><td>Cosas que le disgusta</td><td>${h.dislikes || 'Injusticias, presiones excesivas'}</td></tr>
                            <tr><td>Descripción de la Dinámica Familiar</td><td>${h.familyDynamics || 'Comunicación asertiva, apoyo mutuo en el hogar'}</td></tr>
                        </table>
                    </div>
                </div>

                <!-- SECCIÓN 8: ÁREAS VITALES & ENTREVISTA PRIVADA CON EL ADOLESCENTE -->
                <div class="hist-acc-item active" id="acc_teen_8">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_teen_8')">
                        <div class="hist-acc-title">
                            <span class="acc-num">8</span>
                            <strong>🧑‍🎤 Áreas Vitales & Entrevista Privada con el Adolescente</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-sub-heading" style="margin-top:0;">DESCRIPCIÓN DE ACUERDO A LA ENTEVISTA CON EL ADOLESCENTE:</div>
                        <table class="hist-table-medical">
                            <tr><td style="width:40%;">Infancia</td><td>${h.teenChildhood || 'Refiere recuerdos positivos y afectuosos de su niñez'}</td></tr>
                            <tr><td>Área Social</td><td>${h.teenSocial || 'Grupo de pares estructurado y relaciones de confianza'}</td></tr>
                            <tr><td>Área Sexual (Interés por Sexualidad o identificación de género)</td><td>${h.teenSexuality || 'En exploración saludable y adaptativa acorde a su edad'}</td></tr>
                            <tr><td>Área Espiritual</td><td>${h.teenSpirituality || 'Valores éticos y humanistas en formación'}</td></tr>
                            <tr><td>Descripción de la Dinámica Familiar</td><td>${h.teenFamilyDynamics || 'Buena relación con progenitores; negociación de límites'}</td></tr>
                            <tr><td>Relaciones Interpersonales (amistades y pareja)</td><td>${h.teenRelationships || 'Vínculos significativos, lealtad y apoyo mutuo'}</td></tr>
                        </table>
                    </div>
                </div>

                <!-- SECCIÓN 9: VIVIENDA, HÁBITOS PSICOBIOLÓGICOS, SUEÑO & FOBIAS -->
                <div class="hist-acc-item active" id="acc_teen_9">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_teen_9')">
                        <div class="hist-acc-title">
                            <span class="acc-num">9</span>
                            <strong>🏠 Vivienda, Hábitos Psicobiológicos, Sueño & Fobias</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-sub-heading" style="margin-top:0;">ÁREA DE VIVIENDA:</div>
                        <div class="hist-grid-data" style="margin-bottom:12px;">
                            <div><strong>Tipo de Vivienda:</strong> ${h.housingType || 'Casa'}</div>
                            <div><strong>Servicios Básicos:</strong> ${h.housingServices || 'Sí'}</div>
                            <div><strong>Comparte Habitación:</strong> ${h.housingSharesRoom || 'No'} ${h.housingSharesRoomDesc ? `(${h.housingSharesRoomDesc})` : ''}</div>
                            <div><strong>Convivientes en Hogar:</strong> Adultos: ${h.occupantsAdultsF ?? 0}F / ${h.occupantsAdultsM ?? 0}M · Adolescentes: ${h.occupantsTeensF ?? 0}F / ${h.occupantsTeensM ?? 0}M · Niños: ${h.occupantsChildrenF ?? 0}F / ${h.occupantsChildrenM ?? 0}M</div>
                        </div>

                        <div class="hist-sub-heading">HÁBITOS PSICOBIOLÓGICOS:</div>
                        <table class="hist-table-medical">
                            <tr><td style="width:40%;">Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.):</td><td>${h.addictions || 'Negativo / Sin adicciones'}</td></tr>
                            <tr><td>Manías Sociales (Tics, rutinas que maneje en un determinado espacio)</td><td>${h.socialManias || 'No manifiesta tics ni manías'}</td></tr>
                            <tr><td>Fobias o miedo intenso</td><td>${h.phobias || 'Sin fobias específicas'}</td></tr>
                            <tr><td>Miedos nocturnos</td><td>${h.nightTerrors || 'Negativo'}</td></tr>
                            <tr><td>Ornicofagia</td><td>${h.ornicofagia || h.onychophagy || 'No presenta'}</td></tr>
                            <tr><td>Sueño</td><td>${h.sleepPattern || 'Sueño reparador (7-8 horas continuas)'}</td></tr>
                            <tr><td>Alimentación</td><td>${h.eatingPattern || 'Apetito normal, 3 comidas balanceadas'}</td></tr>
                            <tr><td>Higiene</td><td>${h.hygienePattern || 'Adecuada presentación e higiene personal'}</td></tr>
                            <tr><td>Área Recreacional</td><td>${h.recreationArea || 'Deportes, pasatiempos, arte y música'}</td></tr>
                            <tr><td>Rutina Diaria</td><td>${h.dailyRoutine || 'Estructurada: colegio, tareas, esparcimiento y descanso'}</td></tr>
                            <tr><td>Metas a Corto y Mediano Plazo</td><td>${h.teenShortGoals || h.mediumTermGoals || h.shortTermGoals || 'Buen rendimiento académico y desarrollo de habilidades personales'}</td></tr>
                            <tr><td>Metas a Largo Plazo</td><td>${h.teenLongGoals || h.longTermGoals || 'Estudios profesionales y proyecto de vida autónomo'}</td></tr>
                        </table>
                    </div>
                </div>

                <!-- SECCIÓN 10: IMPRESIÓN DIAGNÓSTICA Y PLAN TERAPÉUTICO -->
                <div class="hist-acc-item active" id="acc_teen_10">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_teen_10')">
                        <div class="hist-acc-title">
                            <span class="acc-num">10</span>
                            <strong>📑 Impresión Diagnóstica & Plan Terapéutico (CIE-10/11 & DSM-5-TR)</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-field-block">
                            <label>Impresión Diagnóstica Clínica:</label>
                            <p>${h.diagnosticImpression || patient.diagnosis || '<em>En proceso de evaluación diagnóstica integral y seguimiento.</em>'}</p>
                        </div>
                        <div class="hist-field-block" style="margin-top:10px;">
                            <label>Plan Terapéutico y Metas de Intervención:</label>
                            <p>${h.treatmentPlan || patient.treatmentPlan || patient.goals || '<em>Objetivos clínicos de fortalecimiento cognitivo-conductual, regulación emocional, consolidación de la autonomía y acompañamiento familiar psicoeducativo.</em>'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // -------------------------------------------------------------
    // 1.1 RENDERIZADO EXCLUSIVO HISTORIA CLÍNICA ADULTO (5 PÁG. OFICIAL)
    // -------------------------------------------------------------
    renderAdultHistoryIntegral(patient, h, therapist, regInfo) {
        return `
            <div class="clinical-history-toolbar">
                <div class="cht-title">
                    <span class="cht-badge">👤 Historia Clínica Adulto (5 Pág. Oficial)</span>
                    <small>Modelo Oficial Protocolizado · ${therapist.name} (${therapist.specialty}${regInfo})</small>
                </div>
                <div class="cht-actions">
                    <button class="btn-primary" onclick="ClinicalHistorySystem.openFullHistoryEditor('${patient.id}')">
                        <i class="fas fa-edit"></i> Editar Historia Adulto
                    </button>
                    <button class="btn-secondary" onclick="ClinicalHistorySystem.openGenogramModal('${patient.id}')">
                        <i class="fas fa-sitemap"></i> Genograma
                    </button>
                    <button class="btn-secondary" onclick="ClinicalHistorySystem.exportHistoriaOficialPDF('${patient.id}')">
                        <i class="fas fa-print"></i> PDF Oficial (5 Pág.)
                    </button>
                </div>
            </div>

            <div class="accordion-history-container">
                <!-- SECCIÓN 1: IDENTIFICACIÓN DEL PACIENTE -->
                <div class="hist-acc-item active" id="acc_adult_1">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_adult_1')">
                        <div class="hist-acc-title">
                            <span class="acc-num">1</span>
                            <strong>📋 1. Identificación del Paciente</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div style="background:var(--bg-secondary);padding:10px 14px;border-radius:8px;margin-bottom:14px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:13px;">
                            <div><strong>Ha asistido antes a Consulta Psicológica:</strong> <span class="tag tag-sm ${h.hasAttendedBefore === 'SI' ? 'tag-primary' : 'tag-neutral'}">${h.hasAttendedBefore === 'SI' ? 'SÍ' : 'NO'}</span></div>
                            <div><strong>Fecha:</strong> ${h.previousAttendanceDate || (patient.admissionDate ? patient.admissionDate : '—')}</div>
                        </div>

                        <div class="hist-sub-heading">IDENTIFICACIÓN DEL PACIENTE:</div>
                        <div class="hist-grid-data">
                            <div style="grid-column: span 2;"><strong>Nombre Completo:</strong> ${patient.name || 'Sin registrar'}</div>
                            <div><strong>Lugar y Fecha de Nacimiento:</strong> ${h.birthPlace || 'No registrado'} · ${patient.birthdate ? patient.birthdate.split('-').reverse().join('/') : '—'}</div>
                            <div><strong>Edad:</strong> ${h.age ? `${h.age} años` : (patient.birthdate && typeof calculateAge === 'function' ? `${calculateAge(patient.birthdate)} años` : '—')}</div>
                            <div><strong>Sexo:</strong> ${patient.gender || '—'}</div>
                            <div><strong>Estado Civil:</strong> ${patient.maritalStatus || '—'}</div>
                            <div><strong>C.I:</strong> ${h.ci || patient.ci || '—'}</div>
                            <div><strong>Escolaridad:</strong> ${patient.schoolGrade || patient.education || '—'}</div>
                            <div><strong>Ocupación:</strong> ${patient.occupation || '—'}</div>
                            <div><strong>Religión:</strong> ${h.religion || '—'}</div>
                            <div><strong>Vive con:</strong> ${h.livesWith || patient.livesWith || '—'}</div>
                            <div><strong>Dirección:</strong> ${h.address || patient.address || '—'}</div>
                            <div><strong>Teléfono:</strong> ${patient.phone || '—'}</div>
                            <div style="grid-column: span 2;"><strong>Referido por:</strong> ${h.referredBy || (Array.isArray(patient.referral) ? patient.referral.join(', ') : (patient.referral || '—'))}</div>
                        </div>

                        <div class="hist-sub-heading" style="margin-top:16px;">DATOS FILIATORIOS:</div>
                        <div class="siblings-row" style="background:var(--bg-secondary);padding:10px 14px;border-radius:8px;">
                            <span><strong>Nº Hermanos:</strong> ${h.siblingsCount ?? 0}</span>
                            <span><strong>Nº Hermanastros:</strong> ${h.stepSiblingsCount ?? 0}</span>
                            <span><strong>Nº Medio Hermanos:</strong> ${h.halfSiblingsCount ?? 0}</span>
                        </div>

                        <div class="hist-sub-heading" style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
                            <span>GENOGRAMA</span>
                            <button class="btn-secondary btn-sm" onclick="ClinicalHistorySystem.openGenogramModal('${patient.id}')"><i class="fas fa-sitemap"></i> Abrir Genograma</button>
                        </div>
                        <div class="box-container" style="background:var(--bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--border-secondary);min-height:70px;">
                            ${h.genogramNotes ? `<p style="margin:0;">${h.genogramNotes}</p>` : '<p style="margin:0;color:var(--text-tertiary);font-style:italic;">Diagrama de genograma disponible en el editor interactivo.</p>'}
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 2: MOTIVO DE CONSULTA Y EXAMEN MENTAL -->
                <div class="hist-acc-item" id="acc_adult_2">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_adult_2')">
                        <div class="hist-acc-title">
                            <span class="acc-num">2</span>
                            <strong>🧠 2. Motivo de Consulta y Examen Mental</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-sub-heading">MOTIVO DE CONSULTA</div>
                        <div class="hist-field-block">
                            <p>${patient.reason || '<em style="color:var(--text-tertiary);">Sin motivo registrado.</em>'}</p>
                        </div>

                        <div class="hist-sub-heading" style="margin-top:16px;">GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICITAR MOTIVO DE CONSULTA</div>
                        <div class="hist-field-block">
                            <p>${h.observedGestures || '<em style="color:var(--text-tertiary);">Sin observaciones registradas.</em>'}</p>
                        </div>

                        <div class="hist-sub-heading" style="margin-top:16px;">EXAMEN MENTAL</div>
                        <div class="hist-field-block">
                            <p>${h.mentalExam || '<em style="color:var(--text-tertiary);">Sin hallazgos patológicos registrados / En evaluación.</em>'}</p>
                        </div>

                        <div class="hist-sub-heading" style="margin-top:16px;">SINTOMATOLOGÍA PRESENTADA</div>
                        <table class="hist-table-medical">
                            <thead><tr><th style="width:35%;">Eje Sintomático</th><th>Descripción Clínica</th></tr></thead>
                            <tbody>
                                <tr><td><strong>Características Conductuales</strong></td><td>${h.symptomsBehavioral || '—'}</td></tr>
                                <tr><td><strong>Características Emocionales</strong></td><td>${h.symptomsEmotional || '—'}</td></tr>
                                <tr><td><strong>Características Orgánicas</strong></td><td>${h.symptomsOrganic || '—'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SECCIÓN 3: ANTECEDENTES -->
                <div class="hist-acc-item" id="acc_adult_3">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_adult_3')">
                        <div class="hist-acc-title">
                            <span class="acc-num">3</span>
                            <strong>🩺 3. Antecedentes</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-sub-heading">ANTECEDENTES DEL PACIENTE</div>
                        <table class="hist-table-medical">
                            <thead><tr><th style="width:35%;">Antecedente</th><th>Registro Clínico</th></tr></thead>
                            <tbody>
                                <tr><td><strong>Evaluación Neurológica previa</strong></td><td>${h.neuroEvaluation || '—'}</td></tr>
                                <tr><td><strong>Golpes, caídas, lesiones, esguinces o fracturas.</strong></td><td>${h.traumaInjuries || '—'}</td></tr>
                                <tr><td><strong>Operaciones</strong></td><td>${h.surgeries || '—'}</td></tr>
                                <tr><td><strong>Convulsiones</strong></td><td>${h.seizures || '—'}</td></tr>
                                <tr><td><strong>Enfermedades que afectan el Sistema Inmunológico (Hepatitis, Viruela, etc.)</strong></td><td>${h.immuneDiseases || '—'}</td></tr>
                                <tr><td><strong>Alergias</strong></td><td>${h.allergies || '—'}</td></tr>
                                <tr><td><strong>Tratamiento Médico y otras patologías</strong></td><td>${h.medicalTreatment || '—'}</td></tr>
                            </tbody>
                        </table>

                        <div class="hist-sub-heading" style="margin-top:16px;">ANTECEDENTES FAMILIARES</div>
                        <table class="hist-table-medical">
                            <thead><tr><th style="width:35%;">Antecedente</th><th>Registro Clínico</th></tr></thead>
                            <tbody>
                                <tr><td><strong>Antecedentes Médicos Familiares</strong></td><td>${h.familyMedicalHistory || '—'}</td></tr>
                                <tr><td><strong>Antecedentes Psiquiátricos o psicológicos Familiares</strong></td><td>${h.familyPsychiatricHistory || '—'}</td></tr>
                            </tbody>
                        </table>

                        <div class="hist-sub-heading" style="margin-top:16px;">ANTECEDENTES PSIQUIÁTRICOS O PSICOLÓGICOS DEL PACIENTE</div>
                        <table class="hist-table-medical">
                            <thead><tr><th style="width:35%;">Antecedente</th><th>Registro Clínico</th></tr></thead>
                            <tbody>
                                <tr><td><strong>Antecedentes Psiquiátricos o psicológicos del Paciente</strong></td><td>${h.patientPsychiatricHistory || '—'}</td></tr>
                            </tbody>
                        </table>

                        <div class="hist-sub-heading" style="margin-top:16px;">HISTORIA EVOLUTIVA</div>
                        <table class="hist-table-medical">
                            <thead><tr><th style="width:35%;">Etapa</th><th>Vivencias y Desarrollo</th></tr></thead>
                            <tbody>
                                <tr><td><strong>Infancia</strong></td><td>${h.adultInfancyHistory || '—'}</td></tr>
                                <tr><td><strong>Adolescencia</strong></td><td>${h.adultAdolescenceHistory || '—'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SECCIÓN 4: SITUACIÓN ACTUAL Y ÁREAS VITALES -->
                <div class="hist-acc-item" id="acc_adult_4">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_adult_4')">
                        <div class="hist-acc-title">
                            <span class="acc-num">4</span>
                            <strong>🏠 4. Situación Actual y Áreas Vitales</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-sub-heading">SITUACIÓN ACTUAL / ÁREAS VITALES</div>
                        <table class="hist-table-medical">
                            <thead><tr><th style="width:35%;">Área</th><th>Descripción</th></tr></thead>
                            <tbody>
                                <tr><td><strong>Área Social y Relaciones Interpersonales</strong></td><td>${h.adultSocial || '—'}</td></tr>
                                <tr><td><strong>Dinámica Familiar</strong></td><td>${h.adultFamilyDynamics || '—'}</td></tr>
                                <tr><td><strong>Área Espiritual</strong></td><td>${h.adultSpirituality || '—'}</td></tr>
                                <tr><td><strong>Área Sexual</strong></td><td>${h.adultSexual || '—'}</td></tr>
                                <tr><td><strong>Área Laboral</strong></td><td>${h.adultWork || '—'}</td></tr>
                                <tr><td><strong>Aspectos Legales</strong></td><td>${h.adultLegal || '—'}</td></tr>
                            </tbody>
                        </table>

                        <div class="hist-sub-heading" style="margin-top:16px;">ÁREA DE VIVIENDA</div>
                        <div class="hist-grid-data" style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:12px;">
                            <div><strong>Tipo de Vivienda:</strong> ${h.housingType || 'Casa'}</div>
                            <div><strong>Servicios Básicos:</strong> ${h.housingServices || 'Sí'}</div>
                            <div style="grid-column:span 2;"><strong>Comparte Habitación:</strong> ${h.housingSharesRoom || 'No'} ${h.housingSharesRoomDesc ? `— <em>${h.housingSharesRoomDesc}</em>` : ''}</div>
                        </div>

                        <div style="margin-top:10px;">
                            <strong style="font-size:13px;">Personas que Habitan en la Vivienda:</strong>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-top:6px;">
                                <div style="background:var(--bg-secondary);padding:8px 12px;border-radius:6px;">
                                    <strong>Adultos:</strong> Femenino: ${h.occupantsAdultsF ?? 0} | Masculino: ${h.occupantsAdultsM ?? 0}
                                </div>
                                <div style="background:var(--bg-secondary);padding:8px 12px;border-radius:6px;">
                                    <strong>Adolescentes:</strong> Femenino: ${h.occupantsTeensF ?? 0} | Masculino: ${h.occupantsTeensM ?? 0}
                                </div>
                                <div style="background:var(--bg-secondary);padding:8px 12px;border-radius:6px;">
                                    <strong>Niño:</strong> Femenino: ${h.occupantsChildrenF ?? 0} | Masculino: ${h.occupantsChildrenM ?? 0}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 5: HÁBITOS PSICOBIOLÓGICOS -->
                <div class="hist-acc-item" id="acc_adult_5">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_adult_5')">
                        <div class="hist-acc-title">
                            <span class="acc-num">5</span>
                            <strong>🌿 5. Hábitos Psicobiológicos</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-sub-heading">HÁBITOS PSICOBIOLÓGICOS</div>
                        <table class="hist-table-medical">
                            <thead><tr><th style="width:35%;">Hábito / Indicador</th><th>Registro Clínico</th></tr></thead>
                            <tbody>
                                <tr><td><strong>Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.)</strong></td><td>${h.addictions || '—'}</td></tr>
                                <tr><td><strong>Manías Sociales (Tics, rutinas que maneje en un determinado espacio)</strong></td><td>${h.socialManias || '—'}</td></tr>
                                <tr><td><strong>Fobias o Miedo Intenso</strong></td><td>${h.phobias || '—'}</td></tr>
                                <tr><td><strong>Miedos Nocturnos</strong></td><td>${h.nightTerrors || '—'}</td></tr>
                                <tr><td><strong>Ornicofagia</strong></td><td>${h.onychophagy || h.ornicofagia || '—'}</td></tr>
                                <tr><td><strong>Sueño</strong></td><td>${h.sleepPattern || '—'}</td></tr>
                                <tr><td><strong>Alimentación</strong></td><td>${h.eatingPattern || '—'}</td></tr>
                                <tr><td><strong>Higiene</strong></td><td>${h.hygienePattern || '—'}</td></tr>
                                <tr><td><strong>Área Recreacional</strong></td><td>${h.recreationArea || '—'}</td></tr>
                                <tr><td><strong>Rutina Diaria</strong></td><td>${h.dailyRoutine || '—'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SECCIÓN 6: METAS Y PROYECTO DE VIDA -->
                <div class="hist-acc-item" id="acc_adult_6">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_adult_6')">
                        <div class="hist-acc-title">
                            <span class="acc-num">6</span>
                            <strong>🎯 6. Metas y Proyecto de Vida</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-sub-heading">METAS Y PROYECTO DE VIDA</div>
                        <table class="hist-table-medical">
                            <thead><tr><th style="width:35%;">Temporalidad</th><th>Metas Clínicas y Personales</th></tr></thead>
                            <tbody>
                                <tr><td><strong>Metas a Mediano Plazo</strong></td><td>${h.mediumTermGoals || 'En proceso de delimitación'}</td></tr>
                                <tr><td><strong>Metas a Largo Plazo</strong></td><td>${h.longTermGoals || 'En proceso de delimitación'}</td></tr>
                            </tbody>
                        </table>

                        <div style="margin-top:30px;padding:20px;text-align:center;border-top:1px dashed var(--border-secondary);">
                            <div style="width:280px;margin:0 auto;border-top:1.5px solid var(--text-primary);padding-top:6px;font-weight:700;letter-spacing:0.5px;">
                                FIRMA Y SELLO
                            </div>
                            <div style="margin-top:4px;font-size:12px;color:var(--text-secondary);">
                                Psicólogo Mención Clínica<br>
                                <strong>${therapist.name || 'Lusmely Abreu'}</strong><br>
                                ${therapist.fpv ? `FPV ${therapist.fpv}` : (therapist.registry || 'FPV 18.497')}
                            </div>
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

        if (isChild) {
            return this.renderChildHistoryIntegral(patient, h, therapist, regInfo);
        }
        if (isTeen) {
            return this.renderTeenHistoryIntegral(patient, h, therapist, regInfo);
        }
        if (isAdult) {
            return this.renderAdultHistoryIntegral(patient, h, therapist, regInfo);
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
                            <strong>📋 Datos de Identificación del Paciente & Convivencia</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-grid-data">
                            <div><strong>Nombre Completo del Paciente:</strong> ${patient.name || 'Sin registrar'}</div>
                            ${!isChild ? `<div><strong>C.I. / Documento:</strong> ${h.ci || patient.ci || 'Sin registrar'}</div>` : ''}
                            <div><strong>Lugar de Nacimiento:</strong> ${h.birthPlace || 'No registrado'}</div>
                            <div><strong>Religión:</strong> ${h.religion || 'No profesa / No especificada'}</div>
                            <div><strong>Con quién vive:</strong> ${h.livesWith || patient.livesWith || 'No especificado'}</div>
                            <div><strong>Contacto Emergencia:</strong> ${h.emergencyContactName ? `${h.emergencyContactName} (${h.emergencyContactRelation || 'Familiar'}) · Tel: ${h.emergencyContactPhone || '—'}` : 'Sin registrar'}</div>
                            <div style="grid-column:span 2;"><strong>Dirección Domiciliaria:</strong> ${h.address || patient.address || 'Sin registrar'}</div>
                            <div><strong>Referido por:</strong> ${h.referredBy || 'Deseabilidad propia'}</div>
                            <div><strong>Consulta previa:</strong> ${h.hasAttendedBefore === 'SI' ? `Sí (${h.previousAttendanceDate || 'Fecha no esp.'})` : 'Primera vez'}</div>
                        </div>

                        <div class="hist-sub-heading">👨‍👩‍👧 Datos Filiatorios de los Progenitores (Padres)</div>
                        <div class="hist-grid-parents">
                            <div class="parent-box">
                                <h5>Madre: ${h.motherName || 'No registrada'}</h5>
                                <div><small>Edad: ${h.motherAge || '—'} · C.I: ${h.motherCI || '—'}</small></div>
                                <div><small><strong>Escolaridad:</strong> ${h.motherEducation || 'No registrada'}</small></div>
                                <div><small><strong>Ocupación Actual:</strong> ${h.motherJob || 'No registrada'}</small></div>
                                <div><small>Domicilio: ${h.motherAddress || 'Mismo del paciente'}</small></div>
                            </div>
                            <div class="parent-box">
                                <h5>Padre: ${h.fatherName || 'No registrado'}</h5>
                                <div><small>Edad: ${h.fatherAge || '—'} · C.I: ${h.fatherCI || '—'}</small></div>
                                <div><small><strong>Escolaridad:</strong> ${h.fatherEducation || 'No registrada'}</small></div>
                                <div><small><strong>Ocupación Actual:</strong> ${h.fatherJob || 'No registrada'}</small></div>
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
                            <strong>👁️ Motivo de Consulta & Situación Actual</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-field-block">
                            <label>Motivo de Consulta (Manifiesto):</label>
                            <p>${patient.reason || 'Sin motivo explicitado aún.'}</p>
                        </div>
                        <div class="hist-field-block">
                            <label>🩺 Situación / Enfermedad Actual (Historia del Problema y Evolución):</label>
                            <p>${h.currentIllness || '<em>En proceso de indagación semiológica inicial.</em>'}</p>
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
                        <div class="hist-field-block" style="margin: 10px 0; background: var(--bg-secondary); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-secondary);">
                            <label style="font-weight:700; color:var(--text-primary);"><i class="fas fa-stethoscope"></i> Ejes Semiológicos del Examen Mental:</label>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:8px; font-size:12.5px; margin-top:6px;">
                                <div><strong>Orientación / Conciencia:</strong> ${h.mentalOrientation || 'Orientado en tiempo, espacio y persona'}</div>
                                <div><strong>Atención y Memoria:</strong> ${h.mentalAttention || 'Euprosexia y fijación conservada'}</div>
                                <div><strong>Pensamiento:</strong> ${h.mentalThought || 'Curso lógico, fluido, sin delirios'}</div>
                                <div><strong>Afecto / Ánimo:</strong> ${h.mentalAffect || 'Eutimia, adecuada resonancia afectiva'}</div>
                                <div><strong>Juicio e Insight:</strong> ${h.mentalJudgment || 'Juicio de realidad conservado'}</div>
                                <div><strong>Riesgo Autolítico:</strong> <span class="tag tag-sm ${h.mentalSuicidalRisk && h.mentalSuicidalRisk.includes('Descartado') ? 'tag-success' : 'tag-neutral'}">${h.mentalSuicidalRisk || 'Descartado / Negativo'}</span></div>
                            </div>
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

                <!-- BLOQUE 9: IMPRESIÓN DIAGNÓSTICA Y PLAN TERAPÉUTICO -->
                <div class="hist-acc-item" id="acc_sec_9">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_9')">
                        <div class="hist-acc-title">
                            <span class="acc-num">9</span>
                            <strong>📑 Impresión Diagnóstica & Plan Terapéutico (CIE-10/11 & DSM-5-TR)</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-field-block">
                            <label>Impresión Diagnóstica:</label>
                            <p>${h.diagnosticImpression || patient.diagnosis || '<em>En proceso de evaluación diagnóstica integral.</em>'}</p>
                        </div>
                        <div class="hist-field-block" style="margin-top:10px;">
                            <label>Plan Terapéutico y Metas de Intervención:</label>
                            <p>${h.treatmentPlan || patient.treatmentPlan || patient.goals || '<em>Objetivos clínicos de fortalecimiento cognitivo, autorregulación y psicoeducación.</em>'}</p>
                        </div>
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
    // 3.0.0 EDITOR EXCLUSIVO HISTORIA CLÍNICA INFANTIL (7 PÁGINAS OFICIAL)
    // -------------------------------------------------------------
    renderChildHistoryEditorHTML(patient, h, therapistTag) {
        return `
            <div class="modal-overlay" onclick="closeModal('fullHistoryModal')"></div>
            <div class="modal-content modal-xl" style="max-height:92vh;display:flex;flex-direction:column;overflow:hidden;">
                <div class="modal-header" style="flex-shrink:0;">
                    <div>
                        <h2 style="margin:0;">🧒 Historia Clínica Infantil — ${patient.name}</h2>
                        <small style="color:var(--text-tertiary);">Formato Oficial Protocolizado (7 Páginas) · ${therapistTag}</small>
                    </div>
                    <button class="btn-icon" onclick="closeModal('fullHistoryModal')"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="history-editor-nav" style="flex-shrink:0;">
                    <button type="button" class="hist-nav-tab active" onclick="ClinicalHistorySystem.switchEditorTab('child-1', this)">1. Identificación del Paciente</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('child-2', this)">2. Motivo de Consulta y Examen Mental</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('child-3', this)">3. Antecedentes</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('child-4', this)">4. Desarrollo y Escolaridad</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('child-5', this)">5. Dinámica Familiar y Vivienda</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('child-6', this)">6. Hábitos Psicobiológicos</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('child-7', this)">7. Metas y Proyecto de Vida</button>
                </div>

                <form id="fullHistoryForm" style="flex:1;min-height:0;overflow-y:auto;padding:20px;" onsubmit="ClinicalHistorySystem.handleSaveFullHistory(event, '${patient.id}')">
                    <!-- TAB 1: IDENTIFICACIÓN DEL PACIENTE -->
                    <div id="htab-child-1" class="hist-tab-pane active">
                        <h4>Consulta Psicológica Previa</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Ha asistido antes a Consulta Psicológica:</label>
                                <select id="fh_hasAttendedBefore">
                                    <option value="NO" ${h.hasAttendedBefore === 'NO' ? 'selected' : ''}>NO</option>
                                    <option value="SI" ${h.hasAttendedBefore === 'SI' ? 'selected' : ''}>SI</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Fecha:</label>
                                <input type="text" id="fh_previousAttendanceDate" value="${h.previousAttendanceDate || ''}" placeholder="DD/MM/AAAA">
                            </div>
                        </div>

                        <h4 style="margin-top:20px;">IDENTIFICACIÓN DEL PACIENTE:</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Nombre Completo:</label>
                                <input type="text" id="fh_patientName" value="${patient.name || ''}" placeholder="Nombres y Apellidos" required>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Edad:</label>
                                <input type="number" id="fh_age" value="${h.age || ''}" placeholder="Años cumplidos">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Lugar de Nacimiento:</label>
                                <input type="text" id="fh_birthPlace" value="${h.birthPlace || ''}" placeholder="Ciudad, Estado, País">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Fecha de Nacimiento:</label>
                                <input type="date" id="fh_birthdate" value="${patient.birthdate || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Sexo:</label>
                                <select id="fh_gender">
                                    <option value="">Seleccione</option>
                                    <option value="Femenino" ${patient.gender === 'Femenino' ? 'selected' : ''}>Femenino</option>
                                    <option value="Masculino" ${patient.gender === 'Masculino' ? 'selected' : ''}>Masculino</option>
                                    <option value="Otro" ${patient.gender === 'Otro' ? 'selected' : ''}>Otro</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Escolaridad:</label>
                                <input type="text" id="fh_schoolGrade" value="${patient.schoolGrade || h.schoolGrade || ''}" placeholder="Ej: 3er Grado de Primaria">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Vive con:</label>
                                <input type="text" id="fh_livesWith" value="${h.livesWith || ''}" placeholder="Ej: Madre y Padre">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Domicilio:</label>
                                <input type="text" id="fh_address" value="${h.address || patient.address || ''}" placeholder="Dirección de habitación completa">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Referido:</label>
                                <input type="text" id="fh_referredBy" value="${h.referredBy || (Array.isArray(patient.referral) ? patient.referral.join(', ') : (patient.referral || ''))}" placeholder="Institución o profesional">
                            </div>
                        </div>

                        <h4 style="margin-top:20px;">DATOS FILIATORIOS:</h4>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:14px;margin-bottom:14px;">
                            <!-- MADRE -->
                            <div style="background:var(--bg-secondary);padding:14px;border-radius:10px;border:1px solid var(--border-secondary);">
                                <h5 style="margin-top:0;margin-bottom:10px;color:var(--text-primary);font-size:13px;font-weight:700;"><i class="fas fa-female" style="color:#db2777;"></i> Madre</h5>
                                <div class="form-group"><label>Nombre Completo de la Madre:</label><input type="text" id="fh_motherName" value="${h.motherName || ''}" placeholder="Nombre y apellido"></div>
                                <div class="form-row">
                                    <div class="form-group" style="flex:1;"><label>Edad:</label><input type="number" id="fh_motherAge" value="${h.motherAge || ''}" placeholder="Años"></div>
                                    <div class="form-group" style="flex:1;"><label>C.I:</label><input type="text" id="fh_motherCI" value="${h.motherCI || ''}" placeholder="V-12.345.678"></div>
                                </div>
                                <div class="form-group"><label>Escolaridad:</label><input type="text" id="fh_motherEducation" value="${h.motherEducation || ''}" placeholder="Nivel de instrucción"></div>
                                <div class="form-group"><label>Ocupación:</label><input type="text" id="fh_motherJob" value="${h.motherJob || ''}" placeholder="Ocupación u oficio"></div>
                                <div class="form-group"><label>Domicilio:</label><input type="text" id="fh_motherAddress" value="${h.motherAddress || ''}" placeholder="Dirección"></div>
                            </div>

                            <!-- PADRE -->
                            <div style="background:var(--bg-secondary);padding:14px;border-radius:10px;border:1px solid var(--border-secondary);">
                                <h5 style="margin-top:0;margin-bottom:10px;color:var(--text-primary);font-size:13px;font-weight:700;"><i class="fas fa-male" style="color:#0284c7;"></i> Padre</h5>
                                <div class="form-group"><label>Nombre Completo del Padre:</label><input type="text" id="fh_fatherName" value="${h.fatherName || ''}" placeholder="Nombre y apellido"></div>
                                <div class="form-row">
                                    <div class="form-group" style="flex:1;"><label>Edad:</label><input type="number" id="fh_fatherAge" value="${h.fatherAge || ''}" placeholder="Años"></div>
                                    <div class="form-group" style="flex:1;"><label>C.I:</label><input type="text" id="fh_fatherCI" value="${h.fatherCI || ''}" placeholder="V-12.345.678"></div>
                                </div>
                                <div class="form-group"><label>Escolaridad:</label><input type="text" id="fh_fatherEducation" value="${h.fatherEducation || ''}" placeholder="Nivel de instrucción"></div>
                                <div class="form-group"><label>Ocupación:</label><input type="text" id="fh_fatherJob" value="${h.fatherJob || ''}" placeholder="Ocupación u oficio"></div>
                                <div class="form-group"><label>Domicilio:</label><input type="text" id="fh_fatherAddress" value="${h.fatherAddress || ''}" placeholder="Dirección"></div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Nº Hermanos:</label><input type="number" id="fh_siblingsCount" value="${h.siblingsCount ?? 0}" min="0"></div>
                            <div class="form-group" style="flex:1;"><label>Nº Hermanastros:</label><input type="number" id="fh_stepSiblingsCount" value="${h.stepSiblingsCount ?? 0}" min="0"></div>
                            <div class="form-group" style="flex:1;"><label>Nº Medio Hermanos:</label><input type="number" id="fh_halfSiblingsCount" value="${h.halfSiblingsCount ?? 0}" min="0"></div>
                        </div>

                        <h4 style="margin-top:20px;">GENOGRAMA:</h4>
                        <div style="background:var(--bg-secondary);border:1px dashed var(--border-secondary);border-radius:10px;padding:16px;margin-bottom:14px;text-align:center;">
                            <p style="margin:0 0 10px 0;font-size:13px;color:var(--text-secondary);">
                                Estructura vincular y constelación familiar del niño:
                            </p>
                            <button type="button" class="btn-secondary" onclick="ClinicalHistorySystem.openGenogramModal('${patient.id}')">
                                <i class="fas fa-sitemap"></i> Abrir Constructor de Genograma
                            </button>
                            <div class="form-group" style="margin-top:12px;text-align:left;">
                                <label>Observaciones del Genograma:</label>
                                <textarea id="fh_genogramNotes" rows="2" placeholder="Notas sobre la estructura familiar, alianzas, conflictos o dinámicas observadas...">${h.genogramNotes || ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: MOTIVO DE CONSULTA Y EXAMEN MENTAL -->
                    <div id="htab-child-2" class="hist-tab-pane">
                        <h4>MOTIVO DE CONSULTA:</h4>
                        <div class="form-group">
                            <label>Motivo de Consulta:</label>
                            <textarea id="fh_reason" rows="3" placeholder="Motivo de consulta manifiesto referido por los padres / representantes...">${patient.reason || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICAR EL MOTIVO DE CONSULTA:</h4>
                        <div class="form-group">
                            <label>Gestualidad Observada:</label>
                            <textarea id="fh_observedGestures" rows="3" placeholder="Conducta no verbal de los padres y del niño al exponer el motivo...">${h.observedGestures || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">SINTOMATOLOGÍA PRESENTADA:</h4>
                        <div class="form-group">
                            <label>Características Conductuales:</label>
                            <textarea id="fh_symptomsBehavioral" rows="2" placeholder="Inquietud, rabietas, aislamiento, agresividad, hiperactividad...">${h.symptomsBehavioral || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Características Emocionales:</label>
                            <textarea id="fh_symptomsEmotional" rows="2" placeholder="Labilidad, temores, tristeza, ansiedad de separación, apego...">${h.symptomsEmotional || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Características Orgánicas:</label>
                            <textarea id="fh_symptomsOrganic" rows="2" placeholder="Quejas somáticas, cefaleas, dolor abdominal, encopresis, enuresis...">${h.symptomsOrganic || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">EXAMEN MENTAL:</h4>
                        <div class="form-group">
                            <label>Examen Mental:</label>
                            <textarea id="fh_mentalExam" rows="4" placeholder="Apariencia, porte, actitud, contacto visual, lenguaje, psicomotricidad, afecto, pensamiento, sensopercepción, orientación acorde a la edad...">${h.mentalExam || ''}</textarea>
                        </div>
                    </div>

                    <!-- TAB 3: ANTECEDENTES -->
                    <div id="htab-child-3" class="hist-tab-pane">
                        <h4>ANTECEDENTES:</h4>
                        <h5 style="margin-top:14px;color:var(--text-primary);">Antecedentes Médicos del Paciente</h5>
                        <div class="form-group">
                            <label>Evaluación Neurológica:</label>
                            <textarea id="fh_neuroEvaluation" rows="2" placeholder="Evaluaciones o diagnósticos neuropediátricos, electroencefalograma...">${h.neuroEvaluation || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Golpes, caídas, lesiones, esguinces o fracturas:</label>
                            <textarea id="fh_traumaInjuries" rows="2" placeholder="Traumatismos craneoencefálicos, accidentes o fracturas...">${h.traumaInjuries || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Operaciones:</label>
                            <textarea id="fh_surgeries" rows="2" placeholder="Intervenciones quirúrgicas previas...">${h.surgeries || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Convulsiones:</label>
                            <textarea id="fh_seizures" rows="2" placeholder="Episodios febriles o convulsivos...">${h.seizures || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Enfermedades que afectan el Sistema Inmunológico:</label>
                            <textarea id="fh_immuneDiseases" rows="2" placeholder="Enfermedades autoinmunes o déficit inmunológico...">${h.immuneDiseases || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Alergias:</label>
                            <textarea id="fh_allergies" rows="2" placeholder="Alergias a alimentos, medicamentos o ambientales...">${h.allergies || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Tratamiento Actual:</label>
                            <textarea id="fh_medicalTreatment" rows="2" placeholder="Fármacos o terapias activas...">${h.medicalTreatment || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Otros antecedentes:</label>
                            <textarea id="fh_otherMedicalHistory" rows="2" placeholder="Otras condiciones médicas relevantes...">${h.otherMedicalHistory || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">Antecedentes Médicos Familiares:</h4>
                        <div class="form-group">
                            <textarea id="fh_familyMedicalHistory" rows="3" placeholder="Enfermedades crónicas, neurológicas o genéticas en la familia...">${h.familyMedicalHistory || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">Antecedentes Psiquiátricos o psicológicos del Paciente:</h4>
                        <div class="form-group">
                            <textarea id="fh_patientPsychiatricHistory" rows="3" placeholder="Atenciones psicológicas, psiquiátricas o intervenciones previas...">${h.patientPsychiatricHistory || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">Antecedentes Psiquiátricos o psicológicos Familiares:</h4>
                        <div class="form-group">
                            <textarea id="fh_familyPsychiatricHistory" rows="3" placeholder="Trastornos del estado de ánimo, ansiedad, adicciones u otros en familiares...">${h.familyPsychiatricHistory || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">Evaluación o tratamiento Pedagógico Previo del Paciente:</h4>
                        <div class="form-group">
                            <textarea id="fh_pedagogicalHistory" rows="3" placeholder="Psicopedagogía, terapia del lenguaje, estimulación temprana, terapia ocupacional previa...">${h.pedagogicalHistory || ''}</textarea>
                        </div>
                    </div>

                    <!-- TAB 4: DESARROLLO Y ESCOLARIDAD -->
                    <div id="htab-child-4" class="hist-tab-pane">
                        <h4>DESARROLLO PRENATAL</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Embarazo Deseado:</label>
                                <select id="fh_pregnancyDesired">
                                    <option value="SI" ${h.pregnancyDesired === 'SI' ? 'selected' : ''}>SI</option>
                                    <option value="NO" ${h.pregnancyDesired === 'NO' ? 'selected' : ''}>NO</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Embarazo Planificado:</label>
                                <select id="fh_pregnancyPlanned">
                                    <option value="SI" ${h.pregnancyPlanned === 'SI' ? 'selected' : ''}>SI</option>
                                    <option value="NO" ${h.pregnancyPlanned === 'NO' ? 'selected' : ''}>NO</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Número de Embarazo de la Madre:</label>
                                <input type="number" id="fh_pregnancyNumber" value="${h.pregnancyNumber || '1'}" min="1">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Desarrollo del feto durante el embarazo:</label>
                            <textarea id="fh_fetalDevelopment" rows="2" placeholder="Control prenatal, ecografías, movimientos fetales...">${h.fetalDevelopment || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Estado emocional de la madre durante el embarazo:</label>
                            <textarea id="fh_motherEmotionalState" rows="2" placeholder="Duelos, estrés, apoyo de pareja, vivencia emocional...">${h.motherEmotionalState || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Medicación Durante el Embarazo:</label>
                            <textarea id="fh_pregnancyMedication" rows="2" placeholder="Fármacos ingeridos durante la gestación...">${h.pregnancyMedication || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Enfermedades de la Madre Durante el Embarazo:</label>
                            <textarea id="fh_pregnancyDiseases" rows="2" placeholder="Infecciones, preeclampsia, diabetes gestacional, etc...">${h.pregnancyDiseases || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">DATOS DEL PARTO</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Duración del Embarazo:</label>
                                <input type="text" id="fh_pregnancyDuration" value="${h.pregnancyDuration || ''}" placeholder="Ej: 39 semanas / A término">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Duración del Parto:</label>
                                <input type="text" id="fh_deliveryDuration" value="${h.deliveryDuration || ''}" placeholder="Ej: 6 horas">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Tipo de Parto:</label>
                                <select id="fh_deliveryType">
                                    <option value="Natural" ${h.deliveryType === 'Natural' ? 'selected' : ''}>Natural</option>
                                    <option value="Espontáneo" ${h.deliveryType === 'Espontáneo' ? 'selected' : ''}>Espontáneo</option>
                                    <option value="Inducido" ${h.deliveryType === 'Inducido' ? 'selected' : ''}>Inducido</option>
                                    <option value="Cesárea" ${h.deliveryType === 'Cesárea' ? 'selected' : ''}>Cesárea</option>
                                </select>
                            </div>
                        </div>

                        <h4 style="margin-top:20px;">ESTADO DEL NIÑO AL NACER</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Llanto al nacer:</label>
                                <select id="fh_birthCry">
                                    <option value="SI" ${h.birthCry === 'SI' ? 'selected' : ''}>SI</option>
                                    <option value="NO" ${h.birthCry === 'NO' ? 'selected' : ''}>NO</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Posición del Bebé:</label>
                                <input type="text" id="fh_babyPosition" value="${h.babyPosition || ''}" placeholder="Cefálica, podálica...">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Peso:</label>
                                <input type="text" id="fh_birthWeight" value="${h.birthWeight || ''}" placeholder="Ej: 3.200 kg">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Medida:</label>
                                <input type="text" id="fh_birthLength" value="${h.birthLength || ''}" placeholder="Ej: 50 cm">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Reanimación:</label>
                                <select id="fh_resuscitation">
                                    <option value="NO" ${h.resuscitation === 'NO' ? 'selected' : ''}>NO</option>
                                    <option value="SI" ${h.resuscitation === 'SI' ? 'selected' : ''}>SI</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Incubadora:</label>
                                <select id="fh_incubator">
                                    <option value="NO" ${h.incubator === 'NO' ? 'selected' : ''}>NO</option>
                                    <option value="SI" ${h.incubator === 'SI' ? 'selected' : ''}>SI</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:2;">
                                <label>Primera alimentación:</label>
                                <input type="text" id="fh_firstFeeding" value="${h.firstFeeding || ''}" placeholder="Lactancia materna, fórmula...">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Otras Observaciones:</label>
                            <textarea id="fh_birthObservations" rows="2" placeholder="Apgar, coloración, complicaciones perinatales...">${h.birthObservations || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">DESARROLLO SOCIAL Y PSICOMOTOR DEL NIÑO ALREDEDOR DE LOS PRIMEROS AÑOS DE VIDA</h4>
                        <div class="form-group">
                            <label>Descripción de la alimentación durante los primeros meses de vida:</label>
                            <textarea id="fh_earlyFeedingDesc" rows="2" placeholder="Succión, tolerancia, lactancia exclusiva, cólicos...">${h.earlyFeedingDesc || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Descripción del proceso de destete:</label>
                            <textarea id="fh_weaningDesc" rows="2" placeholder="Edad del destete, introducción de sólidos, reacción emocional...">${h.weaningDesc || ''}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Control o dureza cefálica:</label><input type="text" id="fh_headControl" value="${h.headControl || ''}" placeholder="Ej: 3 meses"></div>
                            <div class="form-group" style="flex:1;"><label>Edad a la que se sentó por primera vez:</label><input type="text" id="fh_sittingAge" value="${h.sittingAge || ''}" placeholder="Ej: 6 meses"></div>
                            <div class="form-group" style="flex:1;"><label>Gatear:</label><input type="text" id="fh_crawlingAge" value="${h.crawlingAge || ''}" placeholder="Ej: 8 meses"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Primeros pasos:</label><input type="text" id="fh_firstStepsAge" value="${h.firstStepsAge || ''}" placeholder="Ej: 12 meses"></div>
                            <div class="form-group" style="flex:1;"><label>Primeras palabras:</label><input type="text" id="fh_firstWordsAge" value="${h.firstWordsAge || ''}" placeholder="Ej: 10 meses"></div>
                            <div class="form-group" style="flex:1;"><label>Primero dientes:</label><input type="text" id="fh_firstTeeth" value="${h.firstTeeth || ''}" placeholder="Ej: 6 meses"></div>
                            <div class="form-group" style="flex:1;"><label>Control de esfínteres vesical y anal:</label><input type="text" id="fh_sphincterControl" value="${h.sphincterControl || ''}" placeholder="Ej: 2 años y medio"></div>
                        </div>

                        <h4 style="margin-top:20px;">ESCOLARIDAD</h4>
                        <div class="form-group">
                            <label>Guardería o cuidadores:</label>
                            <textarea id="fh_daycareOrCaregivers" rows="2" placeholder="Asistencia a guardería, cuidadores principales...">${h.daycareOrCaregivers || ''}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Edad a la que comenzó la escolaridad:</label><input type="text" id="fh_schoolStartAge" value="${h.schoolStartAge || ''}" placeholder="Ej: 3 años"></div>
                            <div class="form-group" style="flex:1;"><label>Edad a la que aprendió a leer:</label><input type="text" id="fh_readingAge" value="${h.readingAge || ''}" placeholder="Ej: 5 años"></div>
                            <div class="form-group" style="flex:1;"><label>Edad a la que aprendió a escribir:</label><input type="text" id="fh_writingAge" value="${h.writingAge || ''}" placeholder="Ej: 6 años"></div>
                            <div class="form-group" style="flex:1;"><label>Edad a la que aprendió a contar:</label><input type="text" id="fh_countingAge" value="${h.countingAge || ''}" placeholder="Ej: 4 años"></div>
                        </div>
                        <div class="form-group">
                            <label>Proceso de adaptación a la escolaridad:</label>
                            <textarea id="fh_schoolAdaptation" rows="2" placeholder="Llanto, desapego, entusiasmo, timidez inicial...">${h.schoolAdaptation || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Relación con las maestras:</label>
                            <textarea id="fh_teacherRelation" rows="2" placeholder="Aceptación de figuras de autoridad, empatía, quejas...">${h.teacherRelation || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Amigos e interacción en la escuela:</label>
                            <textarea id="fh_schoolFriends" rows="2" placeholder="Sociabilidad, juegos en recreo, amistades preferidas...">${h.schoolFriends || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Desarrollo en la primaria:</label>
                            <textarea id="fh_elementaryDevelopment" rows="2" placeholder="Evolución en la etapa de primaria...">${h.elementaryDevelopment || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Áreas con mayor dificultad para su aprendizaje:</label>
                            <textarea id="fh_learningDifficulties" rows="2" placeholder="Materias o áreas complejas (ej: matemáticas, concentración)...">${h.learningDifficulties || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Áreas con mayor facilidad para su aprendizaje:</label>
                            <textarea id="fh_learningStrengths" rows="2" placeholder="Destrezas destacadas (ej: dibujo, lenguaje, creatividad)...">${h.learningStrengths || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Conducta en el colegio:</label>
                            <textarea id="fh_schoolBehavior" rows="2" placeholder="Disciplina, seguimiento de normas en aula y recreo...">${h.schoolBehavior || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Actitud al realizar actividades:</label>
                            <textarea id="fh_taskAttitude" rows="2" placeholder="Motivación, tolerancia a la frustración, persistencia...">${h.taskAttitude || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Personas con quien realizar actividades escolares en el hogar:</label>
                            <textarea id="fh_homeworkSupport" rows="2" placeholder="Quién orienta y acompaña las tareas en casa...">${h.homeworkSupport || ''}</textarea>
                        </div>
                    </div>

                    <!-- TAB 5: DINÁMICA FAMILIAR Y VIVIENDA -->
                    <div id="htab-child-5" class="hist-tab-pane">
                        <h4>DINÁMICA FAMILIAR Y SOCIAL</h4>
                        <div class="form-group">
                            <label>Conducta en el Hogar:</label>
                            <textarea id="fh_homeBehavior" rows="2" placeholder="Comportamiento cotidiano, colaboración, rutinas familiares...">${h.homeBehavior || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Conducta al Salir de Casa:</label>
                            <textarea id="fh_outdoorsBehavior" rows="2" placeholder="Comportamiento en lugares públicos, visitas, parques...">${h.outdoorsBehavior || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Cosas que le gusta:</label>
                            <textarea id="fh_likes" rows="2" placeholder="Juguetes favoritos, intereses, actividades gratificantes...">${h.likes || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Cosas que le disgusta:</label>
                            <textarea id="fh_dislikes" rows="2" placeholder="Disgustos, desencadenantes de enfado o llanto...">${h.dislikes || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Autonomía:</label>
                            <textarea id="fh_autonomy" rows="2" placeholder="Habilidades de autocuidado acorde a la edad (vestirse, comer solo, aseo)...">${h.autonomy || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Dinámica Familiar:</label>
                            <textarea id="fh_familyDynamics" rows="2" placeholder="Pautas de crianza, límites, resolución de conflictos en el hogar...">${h.familyDynamics || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Área Social:</label>
                            <textarea id="fh_socialArea" rows="2" placeholder="Interacción con pares, primos, vecinos y juegos compartidos...">${h.socialArea || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">ÁREAS DEL DESARROLLO (PÁG. 6)</h4>
                        <div class="form-group">
                            <label>Sexualidad:</label>
                            <textarea id="fh_sexuality" rows="2" placeholder="Curiosidad sexual infantil, preguntas realizadas, autoexploración normal...">${h.sexuality || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Área Espiritual:</label>
                            <textarea id="fh_spirituality" rows="2" placeholder="Valores éticos, vivencias espirituales o religiosas en la familia...">${h.spirituality || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">ÁREA DE VIVIENDA:</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Tipo de Vivienda:</label>
                                <select id="fh_housingType">
                                    <option value="Apartamento" ${h.housingType === 'Apartamento' ? 'selected' : ''}>Apartamento</option>
                                    <option value="Casa" ${h.housingType === 'Casa' ? 'selected' : ''}>Casa</option>
                                    <option value="Otro" ${h.housingType === 'Otro' ? 'selected' : ''}>Otro</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Servicios Básicos:</label>
                                <select id="fh_housingServices">
                                    <option value="Sí" ${h.housingServices === 'Sí' || h.housingServices === 'SI' ? 'selected' : ''}>Sí</option>
                                    <option value="No" ${h.housingServices === 'No' || h.housingServices === 'NO' ? 'selected' : ''}>No</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Comparte Habitación:</label>
                                <select id="fh_housingSharesRoom">
                                    <option value="No" ${h.housingSharesRoom === 'No' || h.housingSharesRoom === 'NO' ? 'selected' : ''}>No</option>
                                    <option value="Sí" ${h.housingSharesRoom === 'Sí' || h.housingSharesRoom === 'SI' ? 'selected' : ''}>Sí</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Especifique:</label>
                            <input type="text" id="fh_housingSharesRoomDesc" value="${h.housingSharesRoomDesc || ''}" placeholder="Con quién comparte habitación...">
                        </div>

                        <h5 style="margin-top:14px;color:var(--text-primary);">Personas que Habitan en la Vivienda</h5>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Adultos — Femenino:</label><input type="number" id="fh_occupantsAdultsF" value="${h.occupantsAdultsF ?? 0}" min="0"></div>
                            <div class="form-group" style="flex:1;"><label>Adultos — Masculino:</label><input type="number" id="fh_occupantsAdultsM" value="${h.occupantsAdultsM ?? 0}" min="0"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Adolescentes — Femenino:</label><input type="number" id="fh_occupantsTeensF" value="${h.occupantsTeensF ?? 0}" min="0"></div>
                            <div class="form-group" style="flex:1;"><label>Adolescentes — Masculino:</label><input type="number" id="fh_occupantsTeensM" value="${h.occupantsTeensM ?? 0}" min="0"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Niño — Femenino:</label><input type="number" id="fh_occupantsChildrenF" value="${h.occupantsChildrenF ?? 0}" min="0"></div>
                            <div class="form-group" style="flex:1;"><label>Niño — Masculino:</label><input type="number" id="fh_occupantsChildrenM" value="${h.occupantsChildrenM ?? 0}" min="0"></div>
                        </div>
                    </div>

                    <!-- TAB 6: HÁBITOS PSICOBIOLÓGICOS -->
                    <div id="htab-child-6" class="hist-tab-pane">
                        <h4>HÁBITOS PSICOBIOLÓGICOS:</h4>
                        <div class="form-group">
                            <label>Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.):</label>
                            <textarea id="fh_addictions" rows="2" placeholder="Uso excesivo de pantallas, videojuegos, exposición...">${h.addictions || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Manías Sociales (Tics, rutinas que maneje en un determinado espacio):</label>
                            <textarea id="fh_socialManias" rows="2" placeholder="Tics motores o vocales, rituales o manías...">${h.socialManias || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Fobias o miedo intenso:</label>
                            <textarea id="fh_phobias" rows="2" placeholder="Miedos intensos a la oscuridad, animales, ruidos fuertes...">${h.phobias || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Miedos nocturnos:</label>
                            <textarea id="fh_nightTerrors" rows="2" placeholder="Pesadillas, terrores nocturnos, sonambulismo...">${h.nightTerrors || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Ornicofagia:</label>
                            <textarea id="fh_ornicofagia" rows="2" placeholder="Hábito compulsivo de morderse o comerse las uñas...">${h.ornicofagia || h.onychophagy || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Sueño:</label>
                            <textarea id="fh_sleepPattern" rows="2" placeholder="Horario, siesta, conciliación, despertares nocturnos...">${h.sleepPattern || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Alimentación:</label>
                            <textarea id="fh_eatingPattern" rows="2" placeholder="Apetito, selectividad alimentaria, horarios...">${h.eatingPattern || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Higiene:</label>
                            <textarea id="fh_hygienePattern" rows="2" placeholder="Aseo personal, lavado de manos, disposición al baño...">${h.hygienePattern || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Área Recreacional:</label>
                            <textarea id="fh_recreationArea" rows="2" placeholder="Juegos, deportes, salidas familiares, actividades al aire libre...">${h.recreationArea || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Rutina Diaria:</label>
                            <textarea id="fh_dailyRoutine" rows="3" placeholder="Estructura de un día habitual (mañana, colegio, tarde, noche)...">${h.dailyRoutine || ''}</textarea>
                        </div>
                    </div>

                    <!-- TAB 7: METAS Y PROYECTO DE VIDA -->
                    <div id="htab-child-7" class="hist-tab-pane">
                        <h4>METAS Y PROYECTO DE VIDA</h4>
                        <div class="form-group">
                            <label>Metas a Corto y Mediano Plazo:</label>
                            <textarea id="fh_shortTermGoals" rows="3" placeholder="Objetivos a corto y mediano plazo (ej: regulación emocional, hábitos escolares, socialización)...">${h.shortTermGoals || h.mediumTermGoals || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Metas a Largo Plazo:</label>
                            <textarea id="fh_longTermGoals" rows="3" placeholder="Metas y expectativas para el desarrollo integral del niño...">${h.longTermGoals || ''}</textarea>
                        </div>
                    </div>

                    <div class="modal-actions" style="margin-top:20px;">
                        <button type="button" class="btn-secondary" onclick="closeModal('fullHistoryModal')">Cerrar</button>
                        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Guardar Historia Clínica Infantil</button>
                    </div>
                </form>
            </div>
        `;
    },

    // -------------------------------------------------------------
    // 3.0.1 EDITOR EXCLUSIVO HISTORIA CLÍNICA ADOLESCENTE (7 PÁGINAS OFICIAL)
    // -------------------------------------------------------------
    renderTeenHistoryEditorHTML(patient, h, therapistTag) {
        return `
            <div class="modal-overlay" onclick="closeModal('fullHistoryModal')"></div>
            <div class="modal-content modal-xl" style="max-height:92vh;display:flex;flex-direction:column;overflow:hidden;">
                <div class="modal-header" style="flex-shrink:0;">
                    <div>
                        <h2 style="margin:0;">📑 Historia Clínica Adolescente — ${patient.name}</h2>
                        <small style="color:var(--text-tertiary);">Formato Oficial Protocolizado (7 Páginas) · ${therapistTag}</small>
                    </div>
                    <button class="btn-icon" onclick="closeModal('fullHistoryModal')"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="history-editor-nav" style="flex-shrink:0;">
                    <button type="button" class="hist-nav-tab active" onclick="ClinicalHistorySystem.switchEditorTab('teen-1', this)">1. Identificación del Paciente</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('teen-2', this)">2. Motivo de Consulta y Examen Mental</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('teen-3', this)">3. Antecedentes</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('teen-4', this)">4. Desarrollo y Escolaridad</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('teen-5', this)">5. Entrevista con el Adolescente</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('teen-6', this)">6. Hábitos Psicobiológicos</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('teen-7', this)">7. Metas y Proyecto de Vida</button>
                </div>

                <form id="fullHistoryForm" style="flex:1;min-height:0;overflow-y:auto;padding:20px;" onsubmit="ClinicalHistorySystem.handleSaveFullHistory(event, '${patient.id}')">
                    <!-- TAB 1: IDENTIFICACIÓN DEL PACIENTE -->
                    <div id="htab-teen-1" class="hist-tab-pane active">
                        <h4>Consulta Psicológica Previa</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Ha asistido antes a Consulta Psicológica:</label>
                                <select id="fh_hasAttendedBefore">
                                    <option value="NO" ${h.hasAttendedBefore === 'NO' ? 'selected' : ''}>NO</option>
                                    <option value="SI" ${h.hasAttendedBefore === 'SI' ? 'selected' : ''}>SI</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Fecha:</label>
                                <input type="text" id="fh_previousAttendanceDate" value="${h.previousAttendanceDate || ''}" placeholder="DD/MM/AAAA">
                            </div>
                        </div>

                        <h4 style="margin-top:20px;">IDENTIFICACIÓN DEL PACIENTE:</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Nombre Completo:</label>
                                <input type="text" id="fh_patientName" value="${patient.name || ''}" placeholder="Nombres y Apellidos" required>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>C.I: (Opcional):</label>
                                <input type="text" id="fh_ci" value="${h.ci || patient.ci || ''}" placeholder="Ej: V-28.123.456">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Lugar de Nacimiento:</label>
                                <input type="text" id="fh_birthPlace" value="${h.birthPlace || ''}" placeholder="Ciudad / Estado">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Fecha de Nacimiento:</label>
                                <input type="date" id="fh_birthdate" value="${patient.birthdate || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Edad:</label>
                                <input type="number" id="fh_age" value="${h.age || ''}" placeholder="Años">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Sexo:</label>
                                <select id="fh_gender">
                                    <option value="">Seleccionar...</option>
                                    <option value="Femenino" ${patient.gender === 'Femenino' ? 'selected' : ''}>Femenino</option>
                                    <option value="Masculino" ${patient.gender === 'Masculino' ? 'selected' : ''}>Masculino</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:2;">
                                <label>Escolaridad:</label>
                                <input type="text" id="fh_schoolGrade" value="${patient.schoolGrade || h.schoolGrade || ''}" placeholder="Año / Nivel cursado">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Vive con:</label>
                                <input type="text" id="fh_livesWith" value="${h.livesWith || ''}" placeholder="Ej: Padres y hermanos">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Referido:</label>
                                <input type="text" id="fh_referredBy" value="${h.referredBy || (Array.isArray(patient.referral) ? patient.referral.join(', ') : (patient.referral || ''))}" placeholder="Referente / Especialista">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Domicilio:</label>
                            <input type="text" id="fh_address" value="${h.address || patient.address || ''}" placeholder="Dirección completa de residencia">
                        </div>

                        <h4 style="margin-top:20px;">DATOS FILIATORIOS:</h4>
                        <div style="background:var(--bg-secondary);padding:14px;border-radius:8px;margin-bottom:14px;border:1px solid var(--border-secondary);">
                            <h5 style="margin-top:0;color:var(--text-primary);font-weight:700;"><i class="fas fa-female" style="color:#db2777;"></i> Madre</h5>
                            <div class="form-row">
                                <div class="form-group" style="flex:2;">
                                    <label>Nombre Completo de la Madre:</label>
                                    <input type="text" id="fh_motherName" value="${h.motherName || ''}">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>Edad:</label>
                                    <input type="text" id="fh_motherAge" value="${h.motherAge || ''}">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>C.I:</label>
                                    <input type="text" id="fh_motherCI" value="${h.motherCI || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group" style="flex:1;">
                                    <label>Escolaridad:</label>
                                    <input type="text" id="fh_motherEducation" value="${h.motherEducation || ''}">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>Ocupación:</label>
                                    <input type="text" id="fh_motherJob" value="${h.motherJob || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Domicilio:</label>
                                <input type="text" id="fh_motherAddress" value="${h.motherAddress || ''}">
                            </div>
                        </div>

                        <div style="background:var(--bg-secondary);padding:14px;border-radius:8px;margin-bottom:14px;border:1px solid var(--border-secondary);">
                            <h5 style="margin-top:0;color:var(--text-primary);font-weight:700;"><i class="fas fa-male" style="color:#0284c7;"></i> Padre</h5>
                            <div class="form-row">
                                <div class="form-group" style="flex:2;">
                                    <label>Nombre Completo del Padre:</label>
                                    <input type="text" id="fh_fatherName" value="${h.fatherName || ''}">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>Edad:</label>
                                    <input type="text" id="fh_fatherAge" value="${h.fatherAge || ''}">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>C.I:</label>
                                    <input type="text" id="fh_fatherCI" value="${h.fatherCI || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group" style="flex:1;">
                                    <label>Escolaridad:</label>
                                    <input type="text" id="fh_fatherEducation" value="${h.fatherEducation || ''}">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>Ocupación:</label>
                                    <input type="text" id="fh_fatherJob" value="${h.fatherJob || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Domicilio:</label>
                                <input type="text" id="fh_fatherAddress" value="${h.fatherAddress || ''}">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Nº Hermanos:</label>
                                <input type="number" id="fh_siblingsCount" value="${h.siblingsCount ?? 0}">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Nº Hermanastros:</label>
                                <input type="number" id="fh_stepSiblingsCount" value="${h.stepSiblingsCount ?? 0}">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Nº Medio Hermanos:</label>
                                <input type="number" id="fh_halfSiblingsCount" value="${h.halfSiblingsCount ?? 0}">
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
                            <h4 style="margin:0;">GENOGRAMA:</h4>
                            <button type="button" class="btn-secondary btn-sm" onclick="ClinicalHistorySystem.openGenogramModal('${patient.id}')">
                                <i class="fas fa-sitemap"></i> Abrir Constructor de Genograma
                            </button>
                        </div>
                        <div class="form-group" style="margin-top:8px;">
                            <label>Notas y Estructura del Genograma:</label>
                            <textarea id="fh_genogramNotes" rows="3" placeholder="Descripción de la estructura familiar, alianzas, conflictos, etc.">${h.genogramNotes || ''}</textarea>
                        </div>
                    </div>

                    <!-- TAB 2: MOTIVO DE CONSULTA Y EXAMEN MENTAL -->
                    <div id="htab-teen-2" class="hist-tab-pane">
                        <h4>MOTIVO DE CONSULTA:</h4>
                        <div class="form-group">
                            <textarea id="fh_reason" rows="3" placeholder="Motivo de consulta manifestado...">${patient.reason || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICAR EL MOTIVO DE CONSULTA:</h4>
                        <div class="form-group">
                            <textarea id="fh_observedGestures" rows="3" placeholder="Postura, contacto ocular, tensión motora, gesticulación...">${h.observedGestures || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">EXAMEN MENTAL:</h4>
                        <div class="form-group">
                            <textarea id="fh_mentalExam" rows="4" placeholder="Porte, orientación, conciencia, afecto, pensamiento, sensopercepción, juicio...">${h.mentalExam || ''}</textarea>
                        </div>

                        <h4 style="margin-top:24px;">SINTOMATOLOGÍA PRESENTADA:</h4>
                        <div class="form-group">
                            <label>Características Conductuales:</label>
                            <textarea id="fh_symptomsBehavioral" rows="2" placeholder="Conductas observables, inquietud, aislamiento...">${h.symptomsBehavioral || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Características Emocionales:</label>
                            <textarea id="fh_symptomsEmotional" rows="2" placeholder="Estados afectivos, labilidad, tristeza, ansiedad, irritabilidad...">${h.symptomsEmotional || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Características Orgánicas:</label>
                            <textarea id="fh_symptomsOrganic" rows="2" placeholder="Quejas somáticas, cefaleas, dolor abdominal, tensión muscular...">${h.symptomsOrganic || ''}</textarea>
                        </div>
                    </div>

                    <!-- TAB 3: ANTECEDENTES -->
                    <div id="htab-teen-3" class="hist-tab-pane">
                        <h4>ANTECEDENTES MÉDICOS DEL PACIENTE:</h4>
                        <div class="form-group"><label>Evaluación Neurológica:</label><input type="text" id="fh_neuroEvaluation" value="${h.neuroEvaluation || ''}"></div>
                        <div class="form-group"><label>Golpes, caídas, lesiones, esguinces o fracturas.:</label><input type="text" id="fh_traumaInjuries" value="${h.traumaInjuries || ''}"></div>
                        <div class="form-group"><label>Operaciones:</label><input type="text" id="fh_surgeries" value="${h.surgeries || ''}"></div>
                        <div class="form-group"><label>Convulsiones:</label><input type="text" id="fh_seizures" value="${h.seizures || ''}"></div>
                        <div class="form-group"><label>Enfermedades que afectan el Sistema Inmunológico:</label><input type="text" id="fh_immuneDiseases" value="${h.immuneDiseases || ''}"></div>
                        <div class="form-group"><label>Alergias:</label><input type="text" id="fh_allergies" value="${h.allergies || ''}"></div>
                        <div class="form-group"><label>Tratamiento Actual:</label><input type="text" id="fh_medicalTreatment" value="${h.medicalTreatment || ''}"></div>
                        <div class="form-group"><label>Otros antecedentes:</label><input type="text" id="fh_otherMedicalHistory" value="${h.otherMedicalHistory || ''}"></div>

                        <h4 style="margin-top:24px;">ANTECEDENTES MÉDICOS FAMILIARES:</h4>
                        <div class="form-group"><textarea id="fh_familyMedicalHistory" rows="2" placeholder="Enfermedades médicas en la familia...">${h.familyMedicalHistory || ''}</textarea></div>

                        <h4 style="margin-top:24px;">ANTECEDENTES PSIQUIÁTRICOS O PSICOLÓGICOS DEL PACIENTE:</h4>
                        <div class="form-group"><textarea id="fh_patientPsychiatricHistory" rows="2" placeholder="Trastornos o evaluaciones previas del paciente...">${h.patientPsychiatricHistory || ''}</textarea></div>

                        <h4 style="margin-top:24px;">ANTECEDENTES PSIQUIÁTRICOS O PSICOLÓGICOS FAMILIARES:</h4>
                        <div class="form-group"><textarea id="fh_familyPsychiatricHistory" rows="2" placeholder="Antecedentes psiquiátricos en la familia...">${h.familyPsychiatricHistory || ''}</textarea></div>

                        <h4 style="margin-top:24px;">EVALUACIÓN O TRATAMIENTO PEDAGÓGICO PREVIO DEL PACIENTE:</h4>
                        <div class="form-group"><textarea id="fh_pedagogicalHistory" rows="2" placeholder="Intervenciones psicopedagógicas previas...">${h.pedagogicalHistory || ''}</textarea></div>
                    </div>

                    <!-- TAB 4: DESARROLLO Y ESCOLARIDAD -->
                    <div id="htab-teen-4" class="hist-tab-pane">
                        <h4>DESARROLLO PRENATAL:</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Embarazo Deseado:</label>
                                <select id="fh_pregnancyDesired">
                                    <option value="SI" ${h.pregnancyDesired === 'SI' ? 'selected' : ''}>SI</option>
                                    <option value="NO" ${h.pregnancyDesired === 'NO' ? 'selected' : ''}>NO</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Embarazo Planificado:</label>
                                <select id="fh_pregnancyPlanned">
                                    <option value="SI" ${h.pregnancyPlanned === 'SI' ? 'selected' : ''}>SI</option>
                                    <option value="NO" ${h.pregnancyPlanned === 'NO' ? 'selected' : ''}>NO</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Número de Embarazo:</label>
                                <input type="text" id="fh_pregnancyNumber" value="${h.pregnancyNumber || ''}">
                            </div>
                        </div>
                        <div class="form-group"><label>Desarrollo del feto durante el embarazo:</label><textarea id="fh_fetalDevelopment" rows="2">${h.fetalDevelopment || ''}</textarea></div>
                        <div class="form-group"><label>Estado emocional de la madre durante el embarazo:</label><textarea id="fh_motherEmotionalState" rows="2">${h.motherEmotionalState || ''}</textarea></div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Medicación Durante el Embarazo:</label><input type="text" id="fh_pregnancyMedication" value="${h.pregnancyMedication || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Enfermedades de la Madre Durante el Embarazo:</label><input type="text" id="fh_pregnancyDiseases" value="${h.pregnancyDiseases || ''}"></div>
                        </div>

                        <h4 style="margin-top:24px;">DATOS DEL PARTO:</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Duración del Embarazo:</label><input type="text" id="fh_pregnancyDuration" value="${h.pregnancyDuration || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Duración del Parto:</label><input type="text" id="fh_deliveryDuration" value="${h.deliveryDuration || ''}"></div>
                            <div class="form-group" style="flex:1;">
                                <label>Tipo de Parto:</label>
                                <select id="fh_deliveryType">
                                    <option value="Natural" ${h.deliveryType === 'Natural' ? 'selected' : ''}>Natural</option>
                                    <option value="Cesárea" ${h.deliveryType === 'Cesárea' ? 'selected' : ''}>Cesárea</option>
                                    <option value="Espontáneo" ${h.deliveryType === 'Espontáneo' ? 'selected' : ''}>Espontáneo</option>
                                    <option value="Inducido" ${h.deliveryType === 'Inducido' ? 'selected' : ''}>Inducido</option>
                                </select>
                            </div>
                        </div>

                        <h4 style="margin-top:24px;">ESTADO DEL NIÑO AL NACER:</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Llanto al nacer:</label>
                                <select id="fh_birthCry">
                                    <option value="SI" ${h.birthCry === 'SI' ? 'selected' : ''}>SI</option>
                                    <option value="NO" ${h.birthCry === 'NO' ? 'selected' : ''}>NO</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;"><label>Posición del Bebé:</label><input type="text" id="fh_babyPosition" value="${h.babyPosition || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Peso:</label><input type="text" id="fh_birthWeight" value="${h.birthWeight || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Medida:</label><input type="text" id="fh_birthLength" value="${h.birthLength || ''}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Reanimación:</label>
                                <select id="fh_resuscitation">
                                    <option value="NO" ${h.resuscitation === 'NO' ? 'selected' : ''}>NO</option>
                                    <option value="SI" ${h.resuscitation === 'SI' ? 'selected' : ''}>SI</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Incubadora:</label>
                                <select id="fh_incubator">
                                    <option value="NO" ${h.incubator === 'NO' ? 'selected' : ''}>NO</option>
                                    <option value="SI" ${h.incubator === 'SI' ? 'selected' : ''}>SI</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:2;"><label>Primera alimentación:</label><input type="text" id="fh_firstFeeding" value="${h.firstFeeding || ''}"></div>
                        </div>
                        <div class="form-group"><label>Otras Observaciones:</label><textarea id="fh_birthObservations" rows="2">${h.birthObservations || ''}</textarea></div>

                        <h4 style="margin-top:24px;">DESARROLLO SOCIAL Y PSICOMOTOR (PRIMEROS AÑOS DE VIDA):</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Alimentación primeros meses:</label><input type="text" id="fh_earlyFeedingDesc" value="${h.earlyFeedingDesc || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Destete:</label><input type="text" id="fh_weaningDesc" value="${h.weaningDesc || ''}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Control cefálico:</label><input type="text" id="fh_headControl" value="${h.headControl || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Edad se sentó:</label><input type="text" id="fh_sittingAge" value="${h.sittingAge || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Gatear:</label><input type="text" id="fh_crawlingAge" value="${h.crawlingAge || ''}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Primeros pasos:</label><input type="text" id="fh_firstStepsAge" value="${h.firstStepsAge || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Primeras palabras:</label><input type="text" id="fh_firstWordsAge" value="${h.firstWordsAge || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Primero dientes:</label><input type="text" id="fh_firstTeeth" value="${h.firstTeeth || ''}"></div>
                        </div>
                        <div class="form-group"><label>Control de esfínteres (Vesical y anal):</label><input type="text" id="fh_sphincterControl" value="${h.sphincterControl || ''}"></div>

                        <h4 style="margin-top:24px;">ESCOLARIDAD:</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;"><label>Guardería o cuidadores:</label><input type="text" id="fh_daycareOrCaregivers" value="${h.daycareOrCaregivers || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Edad comenzó:</label><input type="text" id="fh_schoolStartAge" value="${h.schoolStartAge || ''}"></div>
                        </div>
                        <div class="form-group"><label>Proceso de adaptación a la escolaridad:</label><textarea id="fh_schoolAdaptation" rows="2">${h.schoolAdaptation || ''}</textarea></div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Relación con las maestras:</label><input type="text" id="fh_teacherRelation" value="${h.teacherRelation || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Amigos e interacción en la escuela:</label><input type="text" id="fh_schoolFriends" value="${h.schoolFriends || ''}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Edad aprendió a leer:</label><input type="text" id="fh_readingAge" value="${h.readingAge || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Edad aprendió a escribir:</label><input type="text" id="fh_writingAge" value="${h.writingAge || ''}"></div>
                            <div class="form-group" style="flex:1;"><label>Edad aprendió a contar:</label><input type="text" id="fh_countingAge" value="${h.countingAge || ''}"></div>
                        </div>
                        <div class="form-group"><label>Desarrollo en la primaria:</label><textarea id="fh_elementaryDevelopment" rows="2">${h.elementaryDevelopment || ''}</textarea></div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Áreas con mayor dificultad para su aprendizaje:</label><textarea id="fh_learningDifficulties" rows="2">${h.learningDifficulties || ''}</textarea></div>
                            <div class="form-group" style="flex:1;"><label>Áreas con mayor facilidad para su aprendizaje:</label><textarea id="fh_learningStrengths" rows="2">${h.learningStrengths || ''}</textarea></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Conducta en el colegio:</label><textarea id="fh_schoolBehavior" rows="2">${h.schoolBehavior || ''}</textarea></div>
                            <div class="form-group" style="flex:1;"><label>Actitud al realizar actividades:</label><textarea id="fh_taskAttitude" rows="2">${h.taskAttitude || ''}</textarea></div>
                        </div>
                        <div class="form-group"><label>Personas con quien realizar actividades escolares en el hogar:</label><input type="text" id="fh_homeworkSupport" value="${h.homeworkSupport || ''}"></div>

                        <h4 style="margin-top:24px;">DINÁMICA FAMILIAR Y SOCIAL:</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Conducta en el Hogar:</label><textarea id="fh_homeBehavior" rows="2">${h.homeBehavior || ''}</textarea></div>
                            <div class="form-group" style="flex:1;"><label>Conducta al Salir de Casa:</label><textarea id="fh_outdoorsBehavior" rows="2">${h.outdoorsBehavior || ''}</textarea></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Cosas que le gusta:</label><textarea id="fh_likes" rows="2">${h.likes || ''}</textarea></div>
                            <div class="form-group" style="flex:1;"><label>Cosas que le disgusta:</label><textarea id="fh_dislikes" rows="2">${h.dislikes || ''}</textarea></div>
                        </div>
                        <div class="form-group"><label>Descripción de la Dinámica Familiar:</label><textarea id="fh_familyDynamics" rows="2">${h.familyDynamics || ''}</textarea></div>
                    </div>

                    <!-- TAB 5: ENTREVISTA CON EL ADOLESCENTE -->
                    <div id="htab-teen-5" class="hist-tab-pane">
                        <h4>DESCRIPCIÓN DE ACUERDO A LA ENTEVISTA CON EL ADOLESCENTE:</h4>
                        <div class="form-group"><label>Infancia:</label><textarea id="fh_teenChildhood" rows="3" placeholder="Vivencia de su infancia según el adolescente...">${h.teenChildhood || ''}</textarea></div>
                        <div class="form-group"><label>Área Social:</label><textarea id="fh_teenSocial" rows="3" placeholder="Pares, grupos, integración...">${h.teenSocial || ''}</textarea></div>
                        <div class="form-group"><label>Área Sexual (Interés por Sexualidad o identificación de género):</label><textarea id="fh_teenSexuality" rows="3">${h.teenSexuality || ''}</textarea></div>
                        <div class="form-group"><label>Área Espiritual:</label><textarea id="fh_teenSpirituality" rows="3" placeholder="Valores, creencias, sentido ético...">${h.teenSpirituality || ''}</textarea></div>
                        <div class="form-group"><label>Descripción de la Dinámica Familiar (según el adolescente):</label><textarea id="fh_teenFamilyDynamics" rows="3">${h.teenFamilyDynamics || ''}</textarea></div>
                        <div class="form-group"><label>Relaciones Interpersonales (amistades y pareja):</label><textarea id="fh_teenRelationships" rows="3">${h.teenRelationships || ''}</textarea></div>

                        <h4 style="margin-top:24px;">ÁREA DE VIVIENDA:</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Tipo de Vivienda:</label>
                                <select id="fh_housingType">
                                    <option value="Casa" ${h.housingType === 'Casa' ? 'selected' : ''}>Casa</option>
                                    <option value="Apartamento" ${h.housingType === 'Apartamento' ? 'selected' : ''}>Apartamento</option>
                                    <option value="Otro" ${h.housingType && !['Casa', 'Apartamento'].includes(h.housingType) ? 'selected' : ''}>Otro</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Servicios Básicos:</label>
                                <select id="fh_housingServices">
                                    <option value="Sí" ${h.housingServices === 'Sí' || h.housingServices === 'SI' ? 'selected' : ''}>Sí</option>
                                    <option value="No" ${h.housingServices === 'No' || h.housingServices === 'NO' ? 'selected' : ''}>No</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Comparte Habitación:</label>
                                <select id="fh_housingSharesRoom">
                                    <option value="No" ${h.housingSharesRoom === 'No' || h.housingSharesRoom === 'NO' ? 'selected' : ''}>No</option>
                                    <option value="Sí" ${h.housingSharesRoom === 'Sí' || h.housingSharesRoom === 'SI' ? 'selected' : ''}>Sí</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group"><label>Especifique (si comparte habitación):</label><input type="text" id="fh_housingSharesRoomDesc" value="${h.housingSharesRoomDesc || ''}"></div>

                        <h5 style="margin:16px 0 8px 0; font-size:13px; color:var(--text-primary);">Personas que Habitan en la Vivienda:</h5>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Adultos — Femenino:</label><input type="number" id="fh_occupantsAdultsF" value="${h.occupantsAdultsF ?? 0}" min="0"></div>
                            <div class="form-group" style="flex:1;"><label>Adultos — Masculino:</label><input type="number" id="fh_occupantsAdultsM" value="${h.occupantsAdultsM ?? 0}" min="0"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Adolescentes — Femenino:</label><input type="number" id="fh_occupantsTeensF" value="${h.occupantsTeensF ?? 0}" min="0"></div>
                            <div class="form-group" style="flex:1;"><label>Adolescentes — Masculino:</label><input type="number" id="fh_occupantsTeensM" value="${h.occupantsTeensM ?? 0}" min="0"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;"><label>Niño — Femenino:</label><input type="number" id="fh_occupantsChildrenF" value="${h.occupantsChildrenF ?? 0}" min="0"></div>
                            <div class="form-group" style="flex:1;"><label>Niño — Masculino:</label><input type="number" id="fh_occupantsChildrenM" value="${h.occupantsChildrenM ?? 0}" min="0"></div>
                        </div>
                    </div>

                    <!-- TAB 6: HÁBITOS PSICOBIOLÓGICOS -->
                    <div id="htab-teen-6" class="hist-tab-pane">
                        <h4>HÁBITOS PSICOBIOLÓGICOS:</h4>
                        <div class="form-group">
                            <label>Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.):</label>
                            <textarea id="fh_addictions" rows="2" placeholder="Frecuencia, sustancias, pantallas, impacto...">${h.addictions || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Manías Sociales (Tics, rutinas que maneje en un determinado espacio):</label>
                            <textarea id="fh_socialManias" rows="2" placeholder="Tics, rutinas espaciales, manías...">${h.socialManias || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Fobias o miedo intenso:</label>
                            <textarea id="fh_phobias" rows="2" placeholder="Fobias específicas, miedos invalidantes...">${h.phobias || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Miedos nocturnos:</label>
                            <textarea id="fh_nightTerrors" rows="2" placeholder="Pesadillas, terrores nocturnos...">${h.nightTerrors || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Ornicofagia:</label>
                            <textarea id="fh_ornicofagia" rows="2" placeholder="Hábito compulsivo de morderse o comerse las uñas...">${h.ornicofagia || h.onychophagy || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Sueño:</label>
                            <textarea id="fh_sleepPattern" rows="2" placeholder="Horas, conciliación, calidad reparadora...">${h.sleepPattern || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Alimentación:</label>
                            <textarea id="fh_eatingPattern" rows="2" placeholder="Apetito, horarios, hábitos nutricionales...">${h.eatingPattern || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Higiene:</label>
                            <textarea id="fh_hygienePattern" rows="2" placeholder="Autocuidado, aseo personal, presentación...">${h.hygienePattern || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Área Recreacional:</label>
                            <textarea id="fh_recreationArea" rows="2" placeholder="Pasatiempos, actividades de ocio, deportes...">${h.recreationArea || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Rutina Diaria:</label>
                            <textarea id="fh_dailyRoutine" rows="3" placeholder="Estructura de un día habitual (mañana, tarde, noche)...">${h.dailyRoutine || ''}</textarea>
                        </div>
                    </div>

                    <!-- TAB 7: METAS Y PROYECTO DE VIDA -->
                    <div id="htab-teen-7" class="hist-tab-pane">
                        <h4>METAS Y PROYECTO DE VIDA</h4>
                        <div class="form-group">
                            <label>Metas a Corto y Mediano Plazo:</label>
                            <textarea id="fh_teenShortGoals" rows="3" placeholder="Objetivos a corto y mediano plazo (ej: escolares, autorregulación, hábitos)...">${h.teenShortGoals || h.mediumTermGoals || h.shortTermGoals || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Metas a Largo Plazo:</label>
                            <textarea id="fh_teenLongGoals" rows="3" placeholder="Metas a largo plazo (ej: vocación, estudios superiores, proyecto de vida)...">${h.teenLongGoals || h.longTermGoals || ''}</textarea>
                        </div>
                    </div>

                    <div class="modal-actions" style="margin-top:20px;">
                        <button type="button" class="btn-secondary" onclick="closeModal('fullHistoryModal')">Cerrar</button>
                        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Guardar Historia Clínica Adolescente</button>
                    </div>
                </form>
            </div>
        `;
    },

    // -------------------------------------------------------------
    // 3.0 EDITOR EXCLUSIVO HISTORIA CLÍNICA ADULTO (5 PÁGINAS OFICIAL)
    // -------------------------------------------------------------
    renderAdultHistoryEditorHTML(patient, h, therapistTag) {
        return `
            <div class="modal-overlay" onclick="closeModal('fullHistoryModal')"></div>
            <div class="modal-content modal-xl" style="max-height:92vh;display:flex;flex-direction:column;overflow:hidden;">
                <div class="modal-header" style="flex-shrink:0;">
                    <div>
                        <h2 style="margin:0;">📑 Historia Clínica Adulto — ${patient.name}</h2>
                        <small style="color:var(--text-tertiary);">Formato Oficial Protocolizado (5 Páginas) · ${therapistTag}</small>
                    </div>
                    <button class="btn-icon" onclick="closeModal('fullHistoryModal')"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="history-editor-nav" style="flex-shrink:0;">
                    <button type="button" class="hist-nav-tab active" onclick="ClinicalHistorySystem.switchEditorTab('adult-1', this)">1. Identificación del Paciente</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('adult-2', this)">2. Motivo de Consulta y Examen Mental</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('adult-3', this)">3. Antecedentes</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('adult-4', this)">4. Situación Actual y Áreas Vitales</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('adult-5', this)">5. Hábitos Psicobiológicos</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('adult-6', this)">6. Metas y Proyecto de Vida</button>
                </div>

                <form id="fullHistoryForm" style="flex:1;min-height:0;overflow-y:auto;padding:20px;" onsubmit="ClinicalHistorySystem.handleSaveFullHistory(event, '${patient.id}')">
                    <!-- TAB 1: IDENTIFICACIÓN DEL PACIENTE -->
                    <div id="htab-adult-1" class="hist-tab-pane active">
                        <h4>Consulta Psicológica Previa</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Ha asistido antes a Consulta Psicológica:</label>
                                <select id="fh_hasAttendedBefore">
                                    <option value="NO" ${h.hasAttendedBefore === 'NO' ? 'selected' : ''}>NO</option>
                                    <option value="SI" ${h.hasAttendedBefore === 'SI' ? 'selected' : ''}>SI</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Fecha:</label>
                                <input type="text" id="fh_previousAttendanceDate" value="${h.previousAttendanceDate || ''}" placeholder="DD/MM/AAAA">
                            </div>
                        </div>

                        <h4 style="margin-top:20px;">IDENTIFICACIÓN DEL PACIENTE:</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Nombre Completo:</label>
                                <input type="text" id="fh_patientName" value="${patient.name || ''}" placeholder="Nombres y Apellidos" required>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>C.I:</label>
                                <input type="text" id="fh_ci" value="${h.ci || patient.ci || ''}" placeholder="Ej: V-12.345.678">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Lugar de Nacimiento:</label>
                                <input type="text" id="fh_birthPlace" value="${h.birthPlace || ''}" placeholder="Ciudad, Estado, País">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Fecha de Nacimiento:</label>
                                <input type="date" id="fh_birthdate" value="${patient.birthdate || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Edad:</label>
                                <input type="number" id="fh_age" value="${h.age || ''}" placeholder="Años">
                            </div>
                            <div class="form-group">
                                <label>Sexo:</label>
                                <select id="fh_gender">
                                    <option value="">Seleccionar</option>
                                    <option value="Femenino" ${patient.gender === 'Femenino' ? 'selected' : ''}>Femenino</option>
                                    <option value="Masculino" ${patient.gender === 'Masculino' ? 'selected' : ''}>Masculino</option>
                                    <option value="Otro" ${!['Femenino', 'Masculino'].includes(patient.gender) && patient.gender ? 'selected' : ''}>Otro</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Estado Civil:</label>
                                <select id="fh_maritalStatus">
                                    <option value="">Seleccionar</option>
                                    <option value="Soltero(a)" ${patient.maritalStatus && patient.maritalStatus.includes('Solter') ? 'selected' : ''}>Soltero(a)</option>
                                    <option value="Casado(a)" ${patient.maritalStatus && patient.maritalStatus.includes('Casad') ? 'selected' : ''}>Casado(a)</option>
                                    <option value="Divorciado(a)" ${patient.maritalStatus && patient.maritalStatus.includes('Divorc') ? 'selected' : ''}>Divorciado(a)</option>
                                    <option value="Viudo(a)" ${patient.maritalStatus && patient.maritalStatus.includes('Viud') ? 'selected' : ''}>Viudo(a)</option>
                                    <option value="Conviviente / Unión Libre" ${patient.maritalStatus && (patient.maritalStatus.includes('Conviv') || patient.maritalStatus.includes('Unión')) ? 'selected' : ''}>Conviviente / Unión Libre</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Escolaridad:</label>
                                <input type="text" id="fh_schoolGrade" value="${patient.schoolGrade || patient.education || ''}" placeholder="Ej: Bachiller, Universitario, Postgrado...">
                            </div>
                            <div class="form-group">
                                <label>Ocupación:</label>
                                <input type="text" id="fh_occupation" value="${patient.occupation || ''}" placeholder="Ocupación o profesión">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Religión:</label>
                                <input type="text" id="fh_religion" value="${h.religion || ''}" placeholder="Religión o creencia">
                            </div>
                            <div class="form-group">
                                <label>Vive con:</label>
                                <input type="text" id="fh_livesWith" value="${h.livesWith || patient.livesWith || ''}" placeholder="Ej: Pareja, Hijos, Solo(a)...">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Dirección:</label>
                                <input type="text" id="fh_address" value="${h.address || patient.address || ''}" placeholder="Dirección de residencia">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Teléfono:</label>
                                <input type="tel" id="fh_phone" value="${patient.phone || ''}" placeholder="Teléfono de contacto">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Referido por:</label>
                            <input type="text" id="fh_referredBy" value="${h.referredBy || (Array.isArray(patient.referral) ? patient.referral.join(', ') : (patient.referral || ''))}" placeholder="Profesional o persona que refiere">
                        </div>

                        <h4 style="margin-top:20px;">DATOS FILIATORIOS:</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Nº Hermanos:</label>
                                <input type="number" id="fh_siblingsCount" value="${h.siblingsCount ?? 0}" min="0">
                            </div>
                            <div class="form-group">
                                <label>Nº Hermanastros:</label>
                                <input type="number" id="fh_stepSiblingsCount" value="${h.stepSiblingsCount ?? 0}" min="0">
                            </div>
                            <div class="form-group">
                                <label>Nº Medio Hermanos:</label>
                                <input type="number" id="fh_halfSiblingsCount" value="${h.halfSiblingsCount ?? 0}" min="0">
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
                            <h4 style="margin:0;">GENOGRAMA</h4>
                            <button type="button" class="btn-secondary btn-sm" onclick="ClinicalHistorySystem.openGenogramModal('${patient.id}')">
                                <i class="fas fa-sitemap"></i> Abrir Constructor de Genograma
                            </button>
                        </div>
                        <div class="form-group" style="margin-top:8px;">
                            <label>Notas / Descripción del Genograma:</label>
                            <textarea id="fh_genogramNotes" rows="3" placeholder="Estructura familiar, dinámicas, alianzas o conflictos...">${h.genogramNotes || ''}</textarea>
                        </div>
                    </div>

                    <!-- TAB 2: MOTIVO DE CONSULTA Y EXAMEN MENTAL -->
                    <div id="htab-adult-2" class="hist-tab-pane">
                        <h4>MOTIVO DE CONSULTA</h4>
                        <div class="form-group">
                            <label>Motivo de Consulta:</label>
                            <textarea id="fh_reason" rows="3" placeholder="Motivo manifiesto por el cual acude a consulta...">${patient.reason || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICITAR MOTIVO DE CONSULTA</h4>
                        <div class="form-group">
                            <label>Gestualidad observada:</label>
                            <textarea id="fh_observedGestures" rows="3" placeholder="Postura, contacto visual, gesticulación, microexpresiones, tensión somática...">${h.observedGestures || ''}</textarea>
                        </div>

                        <h4 style="margin-top:20px;">EXAMEN MENTAL</h4>
                        <div class="form-group">
                            <label>Examen Mental:</label>
                            <textarea id="fh_mentalExam" rows="5" placeholder="Porte, actitud, conciencia, orientación, pensamiento, sensopercepción, afecto, memoria, juicio...">${h.mentalExam || ''}</textarea>
                        </div>

                        <h4 style="margin-top:24px;">SINTOMATOLOGÍA PRESENTADA</h4>
                        <div class="form-group">
                            <label>Características Conductuales:</label>
                            <textarea id="fh_symptomsBehavioral" rows="3" placeholder="Comportamientos observables, inquietud, aislamiento, evitación, conductas desadaptativas...">${h.symptomsBehavioral || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Características Emocionales:</label>
                            <textarea id="fh_symptomsEmotional" rows="3" placeholder="Tristeza, angustia, irritabilidad, apatía, labilidad afectiva, culpa...">${h.symptomsEmotional || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Características Orgánicas:</label>
                            <textarea id="fh_symptomsOrganic" rows="3" placeholder="Cefaleas, taquicardia, tensión muscular, problemas gastrointestinales, mareos...">${h.symptomsOrganic || ''}</textarea>
                        </div>
                    </div>

                    <!-- TAB 3: ANTECEDENTES -->
                    <div id="htab-adult-3" class="hist-tab-pane">
                        <h4>ANTECEDENTES DEL PACIENTE</h4>
                        <div class="form-group">
                            <label>Evaluación Neurológica previa:</label>
                            <textarea id="fh_neuroEvaluation" rows="2" placeholder="Estudios neurológicos previos, EEG, resonancias, diagnósticos neurológicos...">${h.neuroEvaluation || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Golpes, caídas, lesiones, esguinces o fracturas.:</label>
                            <textarea id="fh_traumaInjuries" rows="2" placeholder="Traumatismos craneoencefálicos, accidentes, caídas, fracturas...">${h.traumaInjuries || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Operaciones:</label>
                            <textarea id="fh_surgeries" rows="2" placeholder="Intervenciones quirúrgicas pasadas...">${h.surgeries || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Convulsiones:</label>
                            <textarea id="fh_seizures" rows="2" placeholder="Episodios convulsivos, febriles o epilépticos...">${h.seizures || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Enfermedades que afectan el Sistema Inmunológico (Hepatitis, Viruela, etc.):</label>
                            <textarea id="fh_immuneDiseases" rows="2" placeholder="Hepatitis, viruela, enfermedades autoinmunes u otras afecciones inmunitarias...">${h.immuneDiseases || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Alergias:</label>
                            <textarea id="fh_allergies" rows="2" placeholder="Medicamentosas, alimentarias, ambientales...">${h.allergies || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Tratamiento Médico y otras patologías:</label>
                            <textarea id="fh_medicalTreatment" rows="3" placeholder="Fármacos actuales, patologías crónicas, tratamientos activos...">${h.medicalTreatment || ''}</textarea>
                        </div>

                        <h4 style="margin-top:24px;">ANTECEDENTES FAMILIARES</h4>
                        <div class="form-group">
                            <label>Antecedentes Médicos Familiares:</label>
                            <textarea id="fh_familyMedicalHistory" rows="3" placeholder="Enfermedades crónicas, cardiovasculares, metabólicas u oncológicas en la familia...">${h.familyMedicalHistory || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Antecedentes Psiquiátricos o psicológicos Familiares:</label>
                            <textarea id="fh_familyPsychiatricHistory" rows="3" placeholder="Depresión, ansiedad, adicciones, psicosis o suicidio en familiares de 1er y 2do grado...">${h.familyPsychiatricHistory || ''}</textarea>
                        </div>

                        <h4 style="margin-top:24px;">ANTECEDENTES PSIQUIÁTRICOS O PSICOLÓGICOS DEL PACIENTE</h4>
                        <div class="form-group">
                            <label>Antecedentes Psiquiátricos o psicológicos del Paciente:</label>
                            <textarea id="fh_patientPsychiatricHistory" rows="3" placeholder="Trastornos previos, internamientos, psicoterapia previa, psicofármacos...">${h.patientPsychiatricHistory || ''}</textarea>
                        </div>

                        <h4 style="margin-top:24px;">HISTORIA EVOLUTIVA</h4>
                        <div class="form-group">
                            <label>Infancia:</label>
                            <textarea id="fh_adultInfancyHistory" rows="3" placeholder="Vivencias relevantes, eventos significativos, pérdidas, desarrollo en la niñez...">${h.adultInfancyHistory || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Adolescencia:</label>
                            <textarea id="fh_adultAdolescenceHistory" rows="3" placeholder="Desarrollo puberal, socialización, conflictos, eventos críticos en la adolescencia...">${h.adultAdolescenceHistory || ''}</textarea>
                        </div>
                    </div>

                    <!-- TAB 4: SITUACIÓN ACTUAL Y ÁREAS VITALES -->
                    <div id="htab-adult-4" class="hist-tab-pane">
                        <h4>SITUACIÓN ACTUAL / ÁREAS VITALES</h4>
                        <div class="form-group">
                            <label>Área Social y Relaciones Interpersonales:</label>
                            <textarea id="fh_adultSocial" rows="3" placeholder="Amistades, grupos sociales, red de apoyo, habilidades de comunicación...">${h.adultSocial || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Dinámica Familiar:</label>
                            <textarea id="fh_adultFamilyDynamics" rows="3" placeholder="Convivencia familiar, comunicación, roles, conflictos o soporte mutuo...">${h.adultFamilyDynamics || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Área Espiritual:</label>
                            <textarea id="fh_adultSpirituality" rows="3" placeholder="Creencias, valores, sentido de vida, práctica religiosa o espiritual...">${h.adultSpirituality || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Área Sexual:</label>
                            <textarea id="fh_adultSexual" rows="3" placeholder="Vida de pareja, sexualidad, satisfacción, disfunciones o inquietudes afectivas...">${h.adultSexual || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Área Laboral:</label>
                            <textarea id="fh_adultWork" rows="3" placeholder="Desempeño en el trabajo, estabilidad, relación con compañeros/jefes, estrés...">${h.adultWork || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Aspectos Legales:</label>
                            <textarea id="fh_adultLegal" rows="3" placeholder="Litigios, custodias, antecedentes penales o procesos legales en curso...">${h.adultLegal || ''}</textarea>
                        </div>

                        <h4 style="margin-top:24px;">ÁREA DE VIVIENDA</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tipo de Vivienda:</label>
                                <select id="fh_housingType">
                                    <option value="Apartamento" ${h.housingType === 'Apartamento' ? 'selected' : ''}>Apartamento</option>
                                    <option value="Casa" ${h.housingType === 'Casa' ? 'selected' : ''}>Casa</option>
                                    <option value="Otro" ${!['Apartamento', 'Casa'].includes(h.housingType) && h.housingType ? 'selected' : ''}>Otro</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Servicios Básicos:</label>
                                <select id="fh_housingServices">
                                    <option value="Sí" ${h.housingServices === 'Sí' || h.housingServices === 'SI' ? 'selected' : ''}>Sí</option>
                                    <option value="No" ${h.housingServices === 'No' || h.housingServices === 'NO' ? 'selected' : ''}>No</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Comparte Habitación:</label>
                                <select id="fh_housingSharesRoom">
                                    <option value="No" ${h.housingSharesRoom === 'No' || h.housingSharesRoom === 'NO' ? 'selected' : ''}>No</option>
                                    <option value="Sí" ${h.housingSharesRoom === 'Sí' || h.housingSharesRoom === 'SI' ? 'selected' : ''}>Sí</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Especifique (si comparte habitación):</label>
                            <input type="text" id="fh_housingSharesRoomDesc" value="${h.housingSharesRoomDesc || ''}" placeholder="Con quién comparte la habitación">
                        </div>

                        <h5 style="margin:16px 0 8px 0; font-size:13px; color:var(--text-primary);">Personas que Habitan en la Vivienda:</h5>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Adultos — Femenino:</label>
                                <input type="number" id="fh_occupantsAdultsF" value="${h.occupantsAdultsF ?? 0}" min="0">
                            </div>
                            <div class="form-group">
                                <label>Adultos — Masculino:</label>
                                <input type="number" id="fh_occupantsAdultsM" value="${h.occupantsAdultsM ?? 0}" min="0">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Adolescentes — Femenino:</label>
                                <input type="number" id="fh_occupantsTeensF" value="${h.occupantsTeensF ?? 0}" min="0">
                            </div>
                            <div class="form-group">
                                <label>Adolescentes — Masculino:</label>
                                <input type="number" id="fh_occupantsTeensM" value="${h.occupantsTeensM ?? 0}" min="0">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Niño — Femenino:</label>
                                <input type="number" id="fh_occupantsChildrenF" value="${h.occupantsChildrenF ?? 0}" min="0">
                            </div>
                            <div class="form-group">
                                <label>Niño — Masculino:</label>
                                <input type="number" id="fh_occupantsChildrenM" value="${h.occupantsChildrenM ?? 0}" min="0">
                            </div>
                        </div>
                    </div>

                    <!-- TAB 5: HÁBITOS PSICOBIOLÓGICOS -->
                    <div id="htab-adult-5" class="hist-tab-pane">
                        <h4>HÁBITOS PSICOBIOLÓGICOS</h4>
                        <div class="form-group">
                            <label>Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.):</label>
                            <textarea id="fh_addictions" rows="3" placeholder="Frecuencia, sustancia/conducta, tiempo de consumo, impacto...">${h.addictions || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Manías Sociales (Tics, rutinas que maneje en un determinado espacio):</label>
                            <textarea id="fh_socialManias" rows="3" placeholder="Rituales, compulsiones, manías de orden/espacio, tics motores o vocales...">${h.socialManias || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Fobias o Miedo Intenso:</label>
                            <textarea id="fh_phobias" rows="2" placeholder="Fobias específicas, miedos invalidantes...">${h.phobias || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Miedos Nocturnos:</label>
                            <textarea id="fh_nightTerrors" rows="2" placeholder="Pesadillas recurrentes, terrores nocturnos, miedo a la oscuridad...">${h.nightTerrors || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Ornicofagia:</label>
                            <textarea id="fh_onychophagy" rows="2" placeholder="Hábito compulsivo de comerse o morderse las uñas...">${h.onychophagy || h.ornicofagia || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Sueño:</label>
                            <textarea id="fh_sleepPattern" rows="2" placeholder="Horas de sueño, conciliación, despertares nocturnos, calidad reparadora...">${h.sleepPattern || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Alimentación:</label>
                            <textarea id="fh_eatingPattern" rows="2" placeholder="Apetito, horarios, hábitos alimentarios, desórdenes...">${h.eatingPattern || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Higiene:</label>
                            <textarea id="fh_hygienePattern" rows="2" placeholder="Autocuidado, aseo personal, presentación...">${h.hygienePattern || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Área Recreacional:</label>
                            <textarea id="fh_recreationArea" rows="2" placeholder="Pasatiempos, actividades de ocio, deportes, descanso...">${h.recreationArea || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Rutina Diaria:</label>
                            <textarea id="fh_dailyRoutine" rows="3" placeholder="Estructura de un día habitual (mañana, tarde, noche)...">${h.dailyRoutine || ''}</textarea>
                        </div>
                    </div>

                    <!-- TAB 6: METAS Y PROYECTO DE VIDA -->
                    <div id="htab-adult-6" class="hist-tab-pane">
                        <h4>METAS Y PROYECTO DE VIDA</h4>
                        <div class="form-group">
                            <label>Metas a Mediano Plazo:</label>
                            <textarea id="fh_mediumTermGoals" rows="3" placeholder="Objetivos y metas a mediano plazo (ej: regulación emocional, resolución de conflictos, hábitos consolidados)...">${h.mediumTermGoals || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Metas a Largo Plazo:</label>
                            <textarea id="fh_longTermGoals" rows="3" placeholder="Proyecto de vida, metas profesionales, autonomía, consolidación personal a largo plazo...">${h.longTermGoals || ''}</textarea>
                        </div>

                        <div style="margin-top:30px;padding:16px;text-align:center;border-top:1px dashed var(--border-secondary);">
                            <div style="font-weight:700;color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;">
                                Cierre de Historia Clínica Adulto
                            </div>
                            <div style="margin-top:6px;font-size:13px;color:var(--text-primary);">
                                Al guardar, se actualiza el expediente conforme al protocolo deontológico oficial.
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions" style="margin-top:20px;">
                        <button type="button" class="btn-secondary" onclick="closeModal('fullHistoryModal')">Cerrar</button>
                        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Guardar Historia Clínica Adulto</button>
                    </div>
                </form>
            </div>
        `;
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

        if (cat === 'child') {
            modal.innerHTML = this.renderChildHistoryEditorHTML(patient, h, therapistTag);
            openModal('fullHistoryModal');
            return;
        }

        if (cat === 'adolescent') {
            modal.innerHTML = this.renderTeenHistoryEditorHTML(patient, h, therapistTag);
            openModal('fullHistoryModal');
            return;
        }

        if (cat === 'adult') {
            modal.innerHTML = this.renderAdultHistoryEditorHTML(patient, h, therapistTag);
            openModal('fullHistoryModal');
            return;
        }

        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('fullHistoryModal')"></div>
            <div class="modal-content modal-xl" style="max-height:92vh;display:flex;flex-direction:column;overflow:hidden;">
                <div class="modal-header" style="flex-shrink:0;">
                    <div>
                        <h2 style="margin:0;">📑 Expediente Clínico Completo — ${patient.name}</h2>
                        <small style="color:var(--text-tertiary);">Formato Oficial Protocolizado · ${therapistTag} · Etapa: ${cat === 'child' ? 'Niñez' : cat === 'adolescent' ? 'Adolescencia' : 'Adultez'}</small>
                    </div>
                    <button class="btn-icon" onclick="closeModal('fullHistoryModal')"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="history-editor-nav" style="flex-shrink:0;">
                    <button type="button" class="hist-nav-tab active" onclick="ClinicalHistorySystem.switchEditorTab('filiacion', this)">1. Filiación & Genograma</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('motivo', this)">2. Motivo & Situación Actual</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('mental', this)">3. Examen Mental</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('medico', this)">4. Médicos & Neuro</button>
                    ${cat !== 'adult' ? '<button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab(\'perinatal\', this)">5. Perinatal & Hitos</button>' : ''}
                    ${cat !== 'adult' ? '<button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab(\'escolar\', this)">6. Escolaridad</button>' : ''}
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('etapa', this)">${cat === 'adolescent' ? '7. Entrevista Menor' : '7. Áreas Vitales'}</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('habitos', this)">8. Vivienda & Hábitos</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('diagnostico', this)">9. Diagnóstico & Plan</button>
                </div>

                <form id="fullHistoryForm" style="flex:1;min-height:0;overflow-y:auto;padding:20px;" onsubmit="ClinicalHistorySystem.handleSaveFullHistory(event, '${patientId}')">
                    <!-- TAB 1: FILIACIÓN -->
                    <div id="htab-filiacion" class="hist-tab-pane active">
                        <h4>Datos de Identificación del Paciente</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;"><label>Nombre Completo del Paciente:</label><input type="text" id="fh_patientName" value="${patient.name || ''}" placeholder="Nombres y Apellidos"></div>
                            ${cat !== 'child' ? `<div class="form-group" style="flex:1;"><label>Cédula de Identidad (C.I.):</label><input type="text" id="fh_ci" value="${h.ci}"></div>` : ''}
                            <div class="form-group" style="flex:1;"><label>Lugar de Nacimiento:</label><input type="text" id="fh_birthPlace" value="${h.birthPlace}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Religión / Creencias:</label><input type="text" id="fh_religion" value="${h.religion}"></div>
                            <div class="form-group"><label>Personas con las que vive:</label><input type="text" id="fh_livesWith" value="${h.livesWith}"></div>
                        </div>
                        <div class="form-group"><label>Dirección / Domicilio:</label><input type="text" id="fh_address" value="${h.address}"></div>

                        <h4 style="margin-top:16px;">Contacto de Emergencia</h4>
                        <div class="form-row">
                            <div class="form-group"><label>Nombre del Contacto:</label><input type="text" id="fh_emergencyContactName" value="${h.emergencyContactName || ''}" placeholder="Ej: Carmen Gómez"></div>
                            <div class="form-group"><label>Parentesco / Vínculo:</label><input type="text" id="fh_emergencyContactRelation" value="${h.emergencyContactRelation || ''}" placeholder="Ej: Hermana / Cónyuge"></div>
                            <div class="form-group"><label>Teléfono de Emergencia:</label><input type="text" id="fh_emergencyContactPhone" value="${h.emergencyContactPhone || ''}" placeholder="Ej: +58 414 1234567"></div>
                        </div>
                        
                        <h4 style="margin-top:20px;">Datos de los Padres</h4>
                        <h5 style="margin:12px 0 6px 0;color:var(--text-primary);font-size:13px;"><i class="fas fa-female"></i> Datos de la Madre</h5>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;"><label>Nombre de la Madre:</label><input type="text" id="fh_motherName" value="${h.motherName}"></div>
                            <div class="form-group" style="flex:1;"><label>Edad / C.I. Madre:</label><input type="text" id="fh_motherCI" value="${h.motherCI}" placeholder="Ej: 42 años - V-14.889.332"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Escolaridad:</label><input type="text" id="fh_motherEducation" value="${h.motherEducation || ''}" placeholder="Ej: Universitaria / Bachillerato"></div>
                            <div class="form-group"><label>Ocupación Actual:</label><input type="text" id="fh_motherJob" value="${h.motherJob || ''}" placeholder="Ej: Ingeniera / Docente / Comercio"></div>
                        </div>
                        <div class="form-group"><label>Domicilio Madre:</label><input type="text" id="fh_motherAddress" value="${h.motherAddress}"></div>

                        <h5 style="margin:16px 0 6px 0;color:var(--text-primary);font-size:13px;"><i class="fas fa-male"></i> Datos del Padre</h5>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;"><label>Nombre del Padre:</label><input type="text" id="fh_fatherName" value="${h.fatherName}"></div>
                            <div class="form-group" style="flex:1;"><label>Edad / C.I. Padre:</label><input type="text" id="fh_fatherCI" value="${h.fatherCI}" placeholder="Ej: 45 años - V-13.456.789"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Escolaridad:</label><input type="text" id="fh_fatherEducation" value="${h.fatherEducation || ''}" placeholder="Ej: Técnico Superior / Universitaria"></div>
                            <div class="form-group"><label>Ocupación Actual:</label><input type="text" id="fh_fatherJob" value="${h.fatherJob || ''}" placeholder="Ej: Administrador / Mecánico / Empleado"></div>
                        </div>
                        <div class="form-group"><label>Domicilio Padre:</label><input type="text" id="fh_fatherAddress" value="${h.fatherAddress}"></div>
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
                            <label>Motivo de Consulta Manifiesto (Textual del paciente/tutor):</label>
                            <textarea id="fh_reason" rows="3">${patient.reason || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>🩺 Situación / Enfermedad Actual (Cronología, desencadenantes e impacto funcional):</label>
                            <textarea id="fh_currentIllness" rows="3" placeholder="Fecha aproximada de inicio, curso continuo/episódico, factores disparadores, tratamientos previos e interferencia en la vida diaria...">${h.currentIllness || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>🔍 Gestualidad Observada al Explicitar el Motivo (Tensión, postura, llanto, evitación de mirada):</label>
                            <textarea id="fh_observedGestures" rows="3" placeholder="Describa la gestualidad y microexpresiones registradas...">${h.observedGestures}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Expectativas del Proceso Terapéutico:</label>
                            <textarea id="fh_processExpectations" rows="2">${h.processExpectations}</textarea>
                        </div>
                    </div>

                    <!-- TAB 3: EXAMEN MENTAL -->
                    <div id="htab-mental" class="hist-tab-pane">
                        <div class="form-group">
                            <label>Examen Mental General (Porte, Conciencia, Afecto, Pensamiento, Sensopercepción, Juicio):</label>
                            <textarea id="fh_mentalExam" rows="3" placeholder="Porte, actitud, orientación témporo-espacial, atención, afecto, curso del pensamiento, juicio e introspección...">${h.mentalExam}</textarea>
                        </div>
                        <h4 style="margin-top:14px;">Ejes Semiológicos del Examen Mental</h4>
                        <div class="form-row">
                            <div class="form-group"><label>Orientación & Conciencia:</label><input type="text" id="fh_mentalOrientation" value="${h.mentalOrientation || ''}" placeholder="Ej: Lúcido, orientado en tiempo, espacio y persona"></div>
                            <div class="form-group"><label>Atención & Memoria:</label><input type="text" id="fh_mentalAttention" value="${h.mentalAttention || ''}" placeholder="Ej: Euprosexia, memoria episódica conservada"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Pensamiento (Curso y Contenido):</label><input type="text" id="fh_mentalThought" value="${h.mentalThought || ''}" placeholder="Ej: Coherente, lógico, sin delirios"></div>
                            <div class="form-group"><label>Afecto & Estado de Ánimo:</label><input type="text" id="fh_mentalAffect" value="${h.mentalAffect || ''}" placeholder="Ej: Eutimia, resonancia adecuada con el discurso"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Juicio & Raciocinio:</label><input type="text" id="fh_mentalJudgment" value="${h.mentalJudgment || ''}" placeholder="Ej: Juicio de realidad conservado, introspección adecuada"></div>
                            <div class="form-group"><label>Descarte de Riesgo Autolítico / Suicida:</label><select id="fh_mentalSuicidalRisk">
                                <option ${h.mentalSuicidalRisk==='Descartado / Negativo'?'selected':''}>Descartado / Negativo</option>
                                <option ${h.mentalSuicidalRisk==='Ideación Pasiva sin Plan'?'selected':''}>Ideación Pasiva sin Plan</option>
                                <option ${h.mentalSuicidalRisk==='Ideación Activa / Alerta'?'selected':''}>Ideación Activa / Alerta</option>
                                <option ${h.mentalSuicidalRisk==='Antecedente Previo sin Riesgo Actual'?'selected':''}>Antecedente Previo sin Riesgo Actual</option>
                            </select></div>
                        </div>
                        <h4 style="margin-top:14px;">Tríada Sintomatológica</h4>
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
                        <h4>Entrevista Privada y Áreas Vitales del Adolescente</h4>
                        <div class="form-group"><label>Vivencia de su Infancia y Autoconcepto:</label><textarea id="fh_teenChildhood" rows="2">${h.teenChildhood}</textarea></div>
                        <div class="form-group"><label>Dinámica Familiar (según la mirada del adolescente):</label><textarea id="fh_teenFamilyDynamics" rows="2">${h.teenFamilyDynamics}</textarea></div>
                        <div class="form-group"><label>Área Social y Red de Amistades / Pares:</label><textarea id="fh_teenSocial" rows="2">${h.teenSocial}</textarea></div>
                        <div class="form-group"><label>Área Sexual, Afectiva e Identidad de Género:</label><textarea id="fh_teenSexuality" rows="2">${h.teenSexuality}</textarea></div>
                        <div class="form-group"><label>Amistades y Relaciones de Pareja:</label><textarea id="fh_teenRelationships" rows="2">${h.teenRelationships}</textarea></div>
                        <div class="form-group"><label>Área Espiritual, Valores y Creencias:</label><textarea id="fh_teenSpirituality" rows="2">${h.teenSpirituality}</textarea></div>
                        <div class="form-group"><label>Metas Personales a Corto y Mediano Plazo:</label><textarea id="fh_teenShortGoals" rows="2">${h.teenShortGoals}</textarea></div>
                        <div class="form-group"><label>Metas Personales a Largo Plazo y Proyecto Vocacional:</label><textarea id="fh_teenLongGoals" rows="2">${h.teenLongGoals}</textarea></div>
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

                    <!-- TAB 9: DIAGNÓSTICO Y PLAN -->
                    <div id="htab-diagnostico" class="hist-tab-pane">
                        <h4>Juicio Diagnóstico & Plan Terapéutico (Protocolo Clínico)</h4>
                        <div class="form-group">
                            <label>Impresión Diagnóstica (CIE-10 / CIE-11 & DSM-5-TR):</label>
                            <textarea id="fh_diagnosticImpression" rows="3" placeholder="Ej: F41.1 Trastorno de Ansiedad Generalizada [DSM-5: 300.02]">${h.diagnosticImpression || patient.diagnosis || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Plan Terapéutico y Objetivos de Intervención:</label>
                            <textarea id="fh_treatmentPlan" rows="4" placeholder="Metas terapéuticas consensuadas a corto y mediano plazo, modelo psicoterapéutico e interconsultas...">${h.treatmentPlan || patient.treatmentPlan || patient.goals || ''}</textarea>
                        </div>
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

        const patientNameVal = getVal('fh_patientName');
        if (patientNameVal) p.name = patientNameVal;
        const ciVal = getVal('fh_ci');
        if (ciVal !== undefined && ciVal !== null) p.ci = ciVal;
        p.birthPlace = getVal('fh_birthPlace');
        p.religion = getVal('fh_religion');
        p.livesWith = getVal('fh_livesWith');
        p.address = getVal('fh_address');

        // Contacto de Emergencia
        p.emergencyContactName = getVal('fh_emergencyContactName');
        p.emergencyContactRelation = getVal('fh_emergencyContactRelation');
        p.emergencyContactPhone = getVal('fh_emergencyContactPhone');

        p.motherName = getVal('fh_motherName');
        if (document.getElementById('fh_motherAge')) p.motherAge = getVal('fh_motherAge');
        p.motherCI = getVal('fh_motherCI');
        p.motherEducation = getVal('fh_motherEducation');
        p.motherJob = getVal('fh_motherJob');
        p.motherAddress = getVal('fh_motherAddress');
        p.fatherName = getVal('fh_fatherName');
        if (document.getElementById('fh_fatherAge')) p.fatherAge = getVal('fh_fatherAge');
        p.fatherCI = getVal('fh_fatherCI');
        p.fatherEducation = getVal('fh_fatherEducation');
        p.fatherJob = getVal('fh_fatherJob');
        p.fatherAddress = getVal('fh_fatherAddress');
        p.siblingsCount = getVal('fh_siblingsCount');
        p.stepSiblingsCount = getVal('fh_stepSiblingsCount');
        p.halfSiblingsCount = getVal('fh_halfSiblingsCount');

        p.reason = getVal('fh_reason') || p.reason;
        p.currentIllness = getVal('fh_currentIllness');
        p.observedGestures = getVal('fh_observedGestures');
        p.processExpectations = getVal('fh_processExpectations');

        p.mentalExam = getVal('fh_mentalExam');
        p.mentalOrientation = getVal('fh_mentalOrientation');
        p.mentalAttention = getVal('fh_mentalAttention');
        p.mentalThought = getVal('fh_mentalThought');
        p.mentalAffect = getVal('fh_mentalAffect');
        p.mentalJudgment = getVal('fh_mentalJudgment');
        p.mentalSuicidalRisk = getVal('fh_mentalSuicidalRisk');

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
        if (document.getElementById('fh_fetalDevelopment')) p.fetalDevelopment = getVal('fh_fetalDevelopment');
        if (document.getElementById('fh_pregnancyMedication')) p.pregnancyMedication = getVal('fh_pregnancyMedication');
        if (document.getElementById('fh_pregnancyDiseases')) p.pregnancyDiseases = getVal('fh_pregnancyDiseases');
        if (document.getElementById('fh_pregnancyNumber')) p.pregnancyNumber = getVal('fh_pregnancyNumber');
        if (document.getElementById('fh_pregnancyDuration')) p.pregnancyDuration = getVal('fh_pregnancyDuration');
        if (document.getElementById('fh_deliveryDuration')) p.deliveryDuration = getVal('fh_deliveryDuration');
        p.deliveryType = getVal('fh_deliveryType') || p.deliveryType;
        p.birthWeight = getVal('fh_birthWeight');
        p.birthLength = getVal('fh_birthLength');
        p.birthCry = getVal('fh_birthCry') || p.birthCry;
        if (document.getElementById('fh_babyPosition')) p.babyPosition = getVal('fh_babyPosition');
        if (document.getElementById('fh_resuscitation')) p.resuscitation = getVal('fh_resuscitation');
        if (document.getElementById('fh_incubator')) p.incubator = getVal('fh_incubator');
        if (document.getElementById('fh_firstFeeding')) p.firstFeeding = getVal('fh_firstFeeding');
        if (document.getElementById('fh_birthObservations')) p.birthObservations = getVal('fh_birthObservations');
        p.motherEmotionalState = getVal('fh_motherEmotionalState');
        if (document.getElementById('fh_earlyFeedingDesc')) p.earlyFeedingDesc = getVal('fh_earlyFeedingDesc');
        if (document.getElementById('fh_weaningDesc')) p.weaningDesc = getVal('fh_weaningDesc');
        if (document.getElementById('fh_headControl')) p.headControl = getVal('fh_headControl');
        if (document.getElementById('fh_sittingAge')) p.sittingAge = getVal('fh_sittingAge');
        if (document.getElementById('fh_crawlingAge')) p.crawlingAge = getVal('fh_crawlingAge');
        p.firstStepsAge = getVal('fh_firstStepsAge');
        p.firstWordsAge = getVal('fh_firstWordsAge');
        if (document.getElementById('fh_firstTeeth')) p.firstTeeth = getVal('fh_firstTeeth');
        p.sphincterControl = getVal('fh_sphincterControl');

        if (document.getElementById('fh_daycareOrCaregivers')) p.daycareOrCaregivers = getVal('fh_daycareOrCaregivers');
        if (document.getElementById('fh_schoolStartAge')) p.schoolStartAge = getVal('fh_schoolStartAge');
        p.schoolGrade = getVal('fh_schoolGrade') || p.schoolGrade;
        p.schoolAdaptation = getVal('fh_schoolAdaptation');
        if (document.getElementById('fh_teacherRelation')) p.teacherRelation = getVal('fh_teacherRelation');
        if (document.getElementById('fh_schoolFriends')) p.schoolFriends = getVal('fh_schoolFriends');
        if (document.getElementById('fh_readingAge')) p.readingAge = getVal('fh_readingAge');
        if (document.getElementById('fh_writingAge')) p.writingAge = getVal('fh_writingAge');
        if (document.getElementById('fh_countingAge')) p.countingAge = getVal('fh_countingAge');
        if (document.getElementById('fh_elementaryDevelopment')) p.elementaryDevelopment = getVal('fh_elementaryDevelopment');
        p.learningDifficulties = getVal('fh_learningDifficulties');
        if (document.getElementById('fh_learningStrengths')) p.learningStrengths = getVal('fh_learningStrengths');
        p.schoolBehavior = getVal('fh_schoolBehavior');
        if (document.getElementById('fh_taskAttitude')) p.taskAttitude = getVal('fh_taskAttitude');
        if (document.getElementById('fh_homeworkSupport')) p.homeworkSupport = getVal('fh_homeworkSupport');
        if (document.getElementById('fh_homeBehavior')) p.homeBehavior = getVal('fh_homeBehavior');
        if (document.getElementById('fh_outdoorsBehavior')) p.outdoorsBehavior = getVal('fh_outdoorsBehavior');
        if (document.getElementById('fh_likes')) p.likes = getVal('fh_likes');
        if (document.getElementById('fh_dislikes')) p.dislikes = getVal('fh_dislikes');
        if (document.getElementById('fh_familyDynamics')) p.familyDynamics = getVal('fh_familyDynamics');
        if (document.getElementById('fh_autonomy')) p.autonomy = getVal('fh_autonomy');
        if (document.getElementById('fh_socialArea')) p.socialArea = getVal('fh_socialArea');
        if (document.getElementById('fh_sexuality')) p.sexuality = getVal('fh_sexuality');
        if (document.getElementById('fh_spirituality')) p.spirituality = getVal('fh_spirituality');
        if (document.getElementById('fh_shortTermGoals')) p.shortTermGoals = getVal('fh_shortTermGoals');
        if (document.getElementById('fh_otherMedicalHistory')) p.otherMedicalHistory = getVal('fh_otherMedicalHistory');
        if (document.getElementById('fh_pedagogicalHistory')) p.pedagogicalHistory = getVal('fh_pedagogicalHistory');

        p.teenChildhood = getVal('fh_teenChildhood');
        p.teenFamilyDynamics = getVal('fh_teenFamilyDynamics');
        p.teenSocial = getVal('fh_teenSocial');
        p.teenSexuality = getVal('fh_teenSexuality');
        p.teenRelationships = getVal('fh_teenRelationships');
        p.teenSpirituality = getVal('fh_teenSpirituality');
        p.teenShortGoals = getVal('fh_teenShortGoals');
        p.teenLongGoals = getVal('fh_teenLongGoals');

        p.adultWork = getVal('fh_adultWork') || p.adultWork;
        p.adultSexual = getVal('fh_adultSexual') || p.adultSexual;
        p.adultLegal = getVal('fh_adultLegal') || p.adultLegal;
        p.adultSpirituality = getVal('fh_adultSpirituality') || p.adultSpirituality;
        if (document.getElementById('fh_adultSocial')) p.adultSocial = getVal('fh_adultSocial');
        if (document.getElementById('fh_adultFamilyDynamics')) p.adultFamilyDynamics = getVal('fh_adultFamilyDynamics');
        if (document.getElementById('fh_adultInfancyHistory')) p.adultInfancyHistory = getVal('fh_adultInfancyHistory');
        if (document.getElementById('fh_adultAdolescenceHistory')) p.adultAdolescenceHistory = getVal('fh_adultAdolescenceHistory');
        if (document.getElementById('fh_patientPsychiatricHistory')) p.patientPsychiatricHistory = getVal('fh_patientPsychiatricHistory');

        if (document.getElementById('fh_hasAttendedBefore')) p.hasAttendedBefore = getVal('fh_hasAttendedBefore');
        if (document.getElementById('fh_previousAttendanceDate')) p.previousAttendanceDate = getVal('fh_previousAttendanceDate');
        if (document.getElementById('fh_birthdate')) p.birthdate = getVal('fh_birthdate');
        if (document.getElementById('fh_age')) p.age = getVal('fh_age');
        if (document.getElementById('fh_gender')) p.gender = getVal('fh_gender');
        if (document.getElementById('fh_maritalStatus')) p.maritalStatus = getVal('fh_maritalStatus');
        if (document.getElementById('fh_occupation')) p.occupation = getVal('fh_occupation');
        if (document.getElementById('fh_phone')) p.phone = getVal('fh_phone');
        if (document.getElementById('fh_referredBy')) p.referredBy = getVal('fh_referredBy');
        if (document.getElementById('fh_genogramNotes')) p.genogramNotes = getVal('fh_genogramNotes');

        p.housingType = getVal('fh_housingType') || p.housingType;
        p.housingSharesRoom = getVal('fh_housingSharesRoom') || p.housingSharesRoom;
        if (document.getElementById('fh_housingServices')) p.housingServices = getVal('fh_housingServices');
        if (document.getElementById('fh_housingSharesRoomDesc')) p.housingSharesRoomDesc = getVal('fh_housingSharesRoomDesc');
        if (document.getElementById('fh_occupantsAdultsF')) p.occupantsAdultsF = getVal('fh_occupantsAdultsF');
        if (document.getElementById('fh_occupantsAdultsM')) p.occupantsAdultsM = getVal('fh_occupantsAdultsM');
        if (document.getElementById('fh_occupantsTeensF')) p.occupantsTeensF = getVal('fh_occupantsTeensF');
        if (document.getElementById('fh_occupantsTeensM')) p.occupantsTeensM = getVal('fh_occupantsTeensM');
        if (document.getElementById('fh_occupantsChildrenF')) p.occupantsChildrenF = getVal('fh_occupantsChildrenF');
        if (document.getElementById('fh_occupantsChildrenM')) p.occupantsChildrenM = getVal('fh_occupantsChildrenM');

        p.addictions = getVal('fh_addictions') || p.addictions;
        if (document.getElementById('fh_socialManias')) p.socialManias = getVal('fh_socialManias');
        p.phobias = getVal('fh_phobias') || p.phobias;
        if (document.getElementById('fh_nightTerrors')) p.nightTerrors = getVal('fh_nightTerrors');
        p.sleepPattern = getVal('fh_sleepPattern') || p.sleepPattern;
        if (document.getElementById('fh_eatingPattern')) p.eatingPattern = getVal('fh_eatingPattern');
        if (document.getElementById('fh_hygienePattern')) p.hygienePattern = getVal('fh_hygienePattern');
        if (document.getElementById('fh_recreationArea')) p.recreationArea = getVal('fh_recreationArea');
        p.dailyRoutine = getVal('fh_dailyRoutine') || p.dailyRoutine;
        if (document.getElementById('fh_mediumTermGoals')) p.mediumTermGoals = getVal('fh_mediumTermGoals');
        if (document.getElementById('fh_longTermGoals')) p.longTermGoals = getVal('fh_longTermGoals');

        if (document.getElementById('fh_ornicofagia')) {
            p.ornicofagia = getVal('fh_ornicofagia');
            p.onychophagy = p.ornicofagia;
        } else if (document.getElementById('fh_onychophagy')) {
            p.onychophagy = getVal('fh_onychophagy');
            p.ornicofagia = p.onychophagy;
        } else if (getVal('fh_onychophagy')) {
            p.onychophagy = getVal('fh_onychophagy');
            p.ornicofagia = p.onychophagy;
        }
        if (document.getElementById('fh_diagnosticImpression')) p.diagnosticImpression = getVal('fh_diagnosticImpression');
        if (document.getElementById('fh_treatmentPlan')) p.treatmentPlan = getVal('fh_treatmentPlan');

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
    // 5.0.0 EXPORTACIÓN PDF OFICIAL INFANTIL (7 PÁGINAS PROTOCOLIZADAS)
    // -------------------------------------------------------------
    exportHistoriaOficialInfantilPDF(patient, h, age, therapist) {
        const displayAge = h.age ? `${h.age} años` : (age ? `${age} años` : '');
        const therapistTitle = therapist.specialty || 'Psicólogo Mención Clínica';
        const therapistName = therapist.name || 'Lusmely Abreu';
        const therapistRegistry = therapist.registry || 'FPV 18.497';

        const therapistHeader = `
            <div class="official-header">
                <div class="psi-symbol">Ψ</div>
                <div class="therapist-badge">
                    ${therapistTitle}<br>
                    <strong>${therapistName}</strong><br>
                    ${therapistRegistry}
                </div>
            </div>
        `;

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>HISTORIA CLÍNICA INFANTIL - ${patient.name}</title>
    <style>
        @page { size: letter; margin: 12mm 16mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.32; font-size: 10pt; margin: 0; padding: 0; background: #fff; }
        .official-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; border-bottom: 1px solid #000; padding-bottom: 4px; }
        .psi-symbol { font-size: 38pt; line-height: 1; font-family: serif; font-weight: normal; }
        .therapist-badge { text-align: right; font-size: 9.5pt; line-height: 1.25; font-family: 'Times New Roman', Times, serif; }
        h1.doc-title { text-align: center; font-size: 13pt; font-weight: bold; margin: 6px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .pre-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 9.5pt; }
        .chk-box { display: inline-block; border-bottom: 1px solid #000; width: 22px; text-align: center; font-weight: bold; }
        .section-title { font-weight: bold; text-transform: uppercase; font-size: 10pt; margin-top: 10px; margin-bottom: 3px; letter-spacing: 0.2px; }
        .field-row { margin-bottom: 4px; font-size: 9.5pt; line-height: 1.35; }
        .field-row strong { font-weight: bold; }
        .fill-line { display: inline-block; border-bottom: 1px solid #000; min-height: 13px; vertical-align: bottom; }
        table.clinical-table { width: 100%; border-collapse: collapse; margin-top: 2px; margin-bottom: 8px; font-size: 9.5pt; }
        table.clinical-table tr { page-break-inside: avoid; break-inside: avoid; }
        table.clinical-table th, table.clinical-table td { border: 1.2px solid #000; padding: 4px 6px; vertical-align: top; }
        table.clinical-table td.col-label { width: 42%; font-weight: normal; }
        .box-rect { border: 1.2px solid #000; padding: 6px 8px; min-height: 50px; margin-top: 2px; margin-bottom: 8px; font-size: 9.5pt; line-height: 1.35; }
        .box-lines { border-bottom: 1px solid #000; min-height: 24px; margin-top: 2px; margin-bottom: 6px; font-size: 9.5pt; line-height: 1.35; padding: 2px 0; }
        .pdf-page { page-break-after: always; break-after: page; min-height: 940px; box-sizing: border-box; position: relative; display: flex; flex-direction: column; }
        .pdf-page:last-child { page-break-after: avoid; break-after: avoid; }
        .page-content { flex: 1; }
        .page-footer { text-align: center; font-size: 10pt; margin-top: auto; padding-top: 10px; }
        .signature-block { margin-top: 50px; text-align: center; }
        .signature-line { width: 280px; margin: 0 auto; border-top: 1.5px solid #000; padding-top: 4px; font-weight: normal; letter-spacing: 0.6px; font-size: 9.5pt; }
        @media print { 
            body { padding: 0; }
            .pdf-page { page-break-after: always !important; break-after: page !important; }
            .pdf-page:last-child { page-break-after: avoid !important; break-after: avoid !important; }
        }
    </style>
</head>
<body>
    <!-- ================= PÁGINA 1 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            ${therapistHeader}

            <h1 class="doc-title">HISTORIA CLÍNICA INFANTIL</h1>

            <div class="pre-row" style="margin-bottom: 10px;">
                <div>Ha asistido antes a Consulta Psicológica: NO <span class="chk-box">${h.hasAttendedBefore === 'NO' ? 'X' : '&nbsp;'}</span> &nbsp;&nbsp; SI <span class="chk-box">${h.hasAttendedBefore === 'SI' ? 'X' : '&nbsp;'}</span></div>
                <div>Fecha: <span class="fill-line" style="min-width: 90px; text-align: center;">${h.previousAttendanceDate || '/ &nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp; .'}</span></div>
            </div>

            <div class="section-title">DATOS DE IDENTIFICACIÓN DEL PACIENTE:</div>
            <div class="field-row"><strong>Nombre Completo:</strong> <span class="fill-line" style="min-width: 78%;">${patient.name || ''}</span></div>
            <div class="field-row"><strong>Lugar y Fecha de Nacimiento:</strong> <span class="fill-line" style="min-width: 52%;">${h.birthPlace || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp; <span class="fill-line" style="min-width: 90px; text-align: center;">${patient.birthdate ? patient.birthdate.split('-').reverse().join(' / ') : '/ &nbsp;&nbsp; /'}</span></div>
            <div class="field-row">
                <strong>Edad:</strong> <span class="fill-line" style="min-width: 50px; text-align: center;">${displayAge}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Sexo:</strong> <span class="fill-line" style="min-width: 70px; text-align: center;">${patient.gender || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Escolaridad:</strong> <span class="fill-line" style="min-width: 48%;">${patient.schoolGrade || h.schoolGrade || ''}</span>
            </div>
            <div class="field-row"><strong>Vive con:</strong> <span class="fill-line" style="min-width: 89%;">${h.livesWith || ''}</span></div>
            <div class="field-row"><strong>Domicilio:</strong> <span class="fill-line" style="min-width: 88%;">${h.address || patient.address || ''}</span></div>
            <div class="field-row"><strong>Referido:</strong> <span class="fill-line" style="min-width: 89%;">${h.referredBy || (Array.isArray(patient.referral) ? patient.referral.join(', ') : (patient.referral || ''))}</span></div>

            <div class="section-title" style="margin-top: 10px;">DATOS FILIATORIOS DE LOS PADRES:</div>
            <div class="field-row"><strong>Nombre Completo de la Madre:</strong> <span class="fill-line" style="min-width: 66%;">${h.motherName || ''}</span></div>
            <div class="field-row">
                <strong>Edad:</strong> <span class="fill-line" style="min-width: 50px; text-align: center;">${h.motherAge || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>C.I:</strong> <span class="fill-line" style="min-width: 100px; text-align: center;">${h.motherCI || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Escolaridad:</strong> <span class="fill-line" style="min-width: 45%;">${h.motherEducation || ''}</span>
            </div>
            <div class="field-row"><strong>Ocupación:</strong> <span class="fill-line" style="min-width: 40%;">${h.motherJob || ''}</span> &nbsp;&nbsp; <strong>Ocupación Actual:</strong> <span class="fill-line" style="min-width: 32%;">${h.motherJob || ''}</span></div>
            <div class="field-row"><strong>Domicilio:</strong> <span class="fill-line" style="min-width: 88%;">${h.motherAddress || ''}</span></div>

            <div class="field-row" style="margin-top: 6px;"><strong>Nombre Completo del Padre:</strong> <span class="fill-line" style="min-width: 67%;">${h.fatherName || ''}</span></div>
            <div class="field-row">
                <strong>Edad:</strong> <span class="fill-line" style="min-width: 50px; text-align: center;">${h.fatherAge || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>C.I:</strong> <span class="fill-line" style="min-width: 100px; text-align: center;">${h.fatherCI || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Escolaridad:</strong> <span class="fill-line" style="min-width: 45%;">${h.fatherEducation || ''}</span>
            </div>
            <div class="field-row"><strong>Ocupación:</strong> <span class="fill-line" style="min-width: 40%;">${h.fatherJob || ''}</span> &nbsp;&nbsp; <strong>Ocupación Actual:</strong> <span class="fill-line" style="min-width: 32%;">${h.fatherJob || ''}</span></div>
            <div class="field-row"><strong>Domicilio:</strong> <span class="fill-line" style="min-width: 88%;">${h.fatherAddress || ''}</span></div>

            <div class="field-row" style="margin-top: 8px;">
                <strong>Nº Hermanos:</strong> <span class="fill-line" style="min-width: 60px; text-align: center;">${h.siblingsCount ?? ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Nº Hermanastros</strong> <span class="fill-line" style="min-width: 60px; text-align: center;">${h.stepSiblingsCount ?? ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Nº Medio Hermanos:</strong> <span class="fill-line" style="min-width: 60px; text-align: center;">${h.halfSiblingsCount ?? ''}</span>
            </div>

            <div class="section-title" style="margin-top: 10px;">GENOGRAMA</div>
            <div class="box-rect" style="min-height: 85px;">
                ${h.genogramNotes || ''}
            </div>

            <div class="section-title">MOTIVO DE CONSULTA:</div>
            <div class="box-lines" style="min-height: 38px;">${patient.reason || ''}</div>

            <div class="section-title">GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICAR EL MOTIVO DE CONSULTA</div>
            <div class="box-lines" style="min-height: 30px;">${h.observedGestures || ''}</div>

            <div class="section-title">SINTOMATOLOGÍA PRESENTADA:</div>
            <div class="field-row"><strong>Características Conductuales:</strong> <span class="fill-line" style="min-width: 68%;">${h.symptomsBehavioral || ''}</span></div>
        </div>
        <div class="page-footer">1</div>
    </div>

    <!-- ================= PÁGINA 2 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <div class="field-row" style="margin-top: 10px;"><strong>Características Emocionales:</strong> <span class="fill-line" style="min-width: 70%;">${h.symptomsEmotional || ''}</span></div>
            <div class="box-lines" style="min-height: 24px;"></div>

            <div class="field-row" style="margin-top: 10px;"><strong>Características Orgánicas:</strong> <span class="fill-line" style="min-width: 72%;">${h.symptomsOrganic || ''}</span></div>
            <div class="box-lines" style="min-height: 24px;"></div>

            <div class="section-title" style="margin-top: 14px;">EXAMEN MENTAL:</div>
            <div class="box-lines" style="min-height: 60px;">${h.mentalExam || ''}</div>

            <div class="section-title" style="margin-top: 14px;">ANTECEDENTES</div>
            <table class="clinical-table">
                <tr>
                    <th colspan="2" style="text-align: center; font-weight: bold; padding: 5px;">Antecedentes Médicos del Paciente</th>
                </tr>
                <tr>
                    <td class="col-label">Evaluación Neurológica</td>
                    <td>${h.neuroEvaluation || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Golpes, caídas, lesiones, esguinces o fracturas.</td>
                    <td>${h.traumaInjuries || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Operaciones</td>
                    <td>${h.surgeries || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Convulsiones</td>
                    <td>${h.seizures || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Enfermedades que afectan el Sistema Inmunológico</td>
                    <td>${h.immuneDiseases || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Alergias</td>
                    <td>${h.allergies || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Tratamiento Actual</td>
                    <td>${h.medicalTreatment || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Otros antecedentes</td>
                    <td>${h.otherMedicalHistory || ''}</td>
                </tr>
            </table>
        </div>
        <div class="page-footer">2</div>
    </div>

    <!-- ================= PÁGINA 3 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <table class="clinical-table" style="margin-top: 10px;">
                <tr>
                    <th colspan="2" style="text-align: center; font-weight: bold; padding: 5px;">Antecedentes Médicos Familiares</th>
                </tr>
                <tr>
                    <td colspan="2" style="min-height: 38px;">${h.familyMedicalHistory || ''}</td>
                </tr>
                <tr>
                    <th colspan="2" style="text-align: center; font-weight: bold; padding: 5px;">Antecedentes Psiquiátricos o psicológicos del Paciente</th>
                </tr>
                <tr>
                    <td colspan="2" style="min-height: 38px;">${h.patientPsychiatricHistory || ''}</td>
                </tr>
                <tr>
                    <th colspan="2" style="text-align: center; font-weight: bold; padding: 5px;">Antecedentes Psiquiátricos o psicológicos Familiares</th>
                </tr>
                <tr>
                    <td colspan="2" style="min-height: 38px;">${h.familyPsychiatricHistory || ''}</td>
                </tr>
                <tr>
                    <th colspan="2" style="text-align: center; font-weight: bold; padding: 5px;">Evaluación o tratamiento Pedagógico Previo del Paciente</th>
                </tr>
                <tr>
                    <td colspan="2" style="min-height: 38px;">${h.pedagogicalHistory || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 10px;">DESARROLLO PRENATAL</div>
            <div class="pre-row" style="margin-bottom: 6px;">
                <div>Embarazo Deseado: SI <span class="chk-box">${h.pregnancyDesired === 'SI' ? 'X' : '&nbsp;'}</span> &nbsp;&nbsp; NO <span class="chk-box">${h.pregnancyDesired === 'NO' ? 'X' : '&nbsp;'}</span></div>
                <div>Embarazo Planificado: SI <span class="chk-box">${h.pregnancyPlanned === 'SI' ? 'X' : '&nbsp;'}</span> &nbsp;&nbsp; NO <span class="chk-box">${h.pregnancyPlanned === 'NO' ? 'X' : '&nbsp;'}</span></div>
            </div>
            <table class="clinical-table">
                <tr>
                    <td class="col-label">Desarrollo del feto durante el embarazo</td>
                    <td>${h.fetalDevelopment || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Estado emocional de la madre durante el embarazo</td>
                    <td>${h.motherEmotionalState || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Medicación Durante el Embarazo</td>
                    <td>${h.pregnancyMedication || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Enfermedades de la Madre Durante el Embarazo</td>
                    <td>${h.pregnancyDiseases || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Número de Embarazo de la Madre</td>
                    <td>${h.pregnancyNumber || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 10px;">DATOS DEL PARTO</div>
            <table class="clinical-table">
                <tr>
                    <td style="width: 50%;"><strong>Duración del Embarazo:</strong> ${h.pregnancyDuration || ''}</td>
                    <td style="width: 50%;"><strong>Duración del Parto:</strong> ${h.deliveryDuration || ''}</td>
                </tr>
                <tr>
                    <td colspan="2">
                        <strong>Tipo de Parto:</strong> &nbsp;&nbsp;
                        Espontáneo: [ ${h.deliveryType === 'Espontáneo' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp;&nbsp;&nbsp;
                        Inducido: [ ${h.deliveryType === 'Inducido' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp;&nbsp;&nbsp;
                        Cesárea: [ ${h.deliveryType === 'Cesárea' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp;&nbsp;&nbsp;
                        Natural: [ ${h.deliveryType === 'Natural' || (!h.deliveryType) ? 'X' : '&nbsp;'} ]
                    </td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 10px;">ESTADO DEL NIÑO AL NACER</div>
            <table class="clinical-table">
                <tr>
                    <td style="width: 50%;">Llanto al nacer: SI [ ${h.birthCry === 'SI' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp; NO [ ${h.birthCry === 'NO' ? 'X' : '&nbsp;'} ]</td>
                    <td style="width: 50%;">Posición del Bebé: ${h.babyPosition || ''}</td>
                </tr>
                <tr>
                    <td>Peso: ${h.birthWeight || ''}</td>
                    <td>Medida: ${h.birthLength || ''}</td>
                </tr>
                <tr>
                    <td>Reanimación: SI [ ${h.resuscitation === 'SI' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp; NO [ ${h.resuscitation === 'NO' ? 'X' : '&nbsp;'} ]</td>
                    <td>Incubadora: SI [ ${h.incubator === 'SI' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp; NO [ ${h.incubator === 'NO' ? 'X' : '&nbsp;'} ]</td>
                </tr>
                <tr>
                    <td colspan="2">Primera alimentación: ${h.firstFeeding || ''}</td>
                </tr>
                <tr>
                    <td colspan="2">Otras Observaciones: ${h.birthObservations || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 14px; text-align: center;">DESARROLLO SOCIAL Y PSICOMOTOR DEL NIÑO ALREDEDOR DE LOS</div>
        </div>
        <div class="page-footer">3</div>
    </div>

    <!-- ================= PÁGINA 4 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <div class="section-title" style="margin-top: 10px; text-align: center;">PRIMEROS AÑOS DE VIDA</div>
            <table class="clinical-table">
                <tr>
                    <td class="col-label">Descripción de la alimentación durante los primeros meses de vida</td>
                    <td>${h.earlyFeedingDesc || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Descripción del proceso de destete</td>
                    <td>${h.weaningDesc || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Control o dureza cefálica</td>
                    <td>${h.headControl || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Edad a la que se sentó por primera vez</td>
                    <td>${h.sittingAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Gatear</td>
                    <td>${h.crawlingAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Primeros pasos</td>
                    <td>${h.firstStepsAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Primeras palabras</td>
                    <td>${h.firstWordsAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Primero dientes</td>
                    <td>${h.firstTeeth || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Control de esfínteres vesical y anal</td>
                    <td>${h.sphincterControl || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 14px;">ESCOLARIDAD</div>
            <table class="clinical-table">
                <tr>
                    <td class="col-label">Guardería o cuidadores</td>
                    <td>${h.daycareOrCaregivers || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Edad a la que comenzó la escolaridad</td>
                    <td>${h.schoolStartAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Proceso de adaptación a la escolaridad</td>
                    <td>${h.schoolAdaptation || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Relación con las maestras</td>
                    <td>${h.teacherRelation || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Amigos e interacción en la escuela</td>
                    <td>${h.schoolFriends || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Edad a la que aprendió a leer</td>
                    <td>${h.readingAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Edad a la que aprendió a escribir</td>
                    <td>${h.writingAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Edad a la que aprendió a contar</td>
                    <td>${h.countingAge || ''}</td>
                </tr>
            </table>
        </div>
        <div class="page-footer">4</div>
    </div>

    <!-- ================= PÁGINA 5 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <table class="clinical-table" style="margin-top: 10px;">
                <tr>
                    <td class="col-label">Desarrollo en la primaria</td>
                    <td>${h.elementaryDevelopment || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Áreas con mayor dificultad para su aprendizaje</td>
                    <td>${h.learningDifficulties || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Áreas con mayor facilidad para su aprendizaje</td>
                    <td>${h.learningStrengths || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Conducta en el colegio</td>
                    <td>${h.schoolBehavior || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Actitud al realizar actividades</td>
                    <td>${h.taskAttitude || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Personas con quien realizar actividades escolares en el hogar</td>
                    <td>${h.homeworkSupport || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 14px;">DINÁMICA FAMILIAR Y SOCIAL</div>
            <table class="clinical-table">
                <tr>
                    <td class="col-label">Conducta en el Hogar</td>
                    <td>${h.homeBehavior || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Conducta al Salir de Casa</td>
                    <td>${h.outdoorsBehavior || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Cosas que le gusta</td>
                    <td>${h.likes || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Cosas que le disgusta</td>
                    <td>${h.dislikes || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Autonomía</td>
                    <td>${h.autonomy || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Dinámica Familiar</td>
                    <td>${h.familyDynamics || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Área Social</td>
                    <td>${h.socialArea || ''}</td>
                </tr>
            </table>
        </div>
        <div class="page-footer">5</div>
    </div>

    <!-- ================= PÁGINA 6 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <table class="clinical-table" style="margin-top: 10px;">
                <tr>
                    <td class="col-label">Sexualidad</td>
                    <td>${h.sexuality || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Área Espiritual</td>
                    <td>${h.spirituality || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 14px;">ÁREA DE VIVIENDA</div>
            <table class="clinical-table">
                <tr>
                    <td colspan="2">
                        Apartamento: [ ${h.housingType === 'Apartamento' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp;&nbsp;&nbsp;
                        Casa: [ ${h.housingType === 'Casa' || (!h.housingType) ? 'X' : '&nbsp;'} ] &nbsp;&nbsp;&nbsp;&nbsp;
                        Otro: [ ${h.housingType && h.housingType !== 'Apartamento' && h.housingType !== 'Casa' ? 'X' : '&nbsp;'} ]
                    </td>
                </tr>
                <tr>
                    <td style="width: 50%;">Servicios Básicos: Sí [ ${h.housingServices === 'Sí' || h.housingServices === 'SI' || (!h.housingServices) ? 'X' : '&nbsp;'} ] &nbsp;&nbsp; No [ ${h.housingServices === 'No' || h.housingServices === 'NO' ? 'X' : '&nbsp;'} ]</td>
                    <td style="width: 50%;">Comparte Habitación: Sí [ ${h.housingSharesRoom === 'Sí' || h.housingSharesRoom === 'SI' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp; No [ ${h.housingSharesRoom === 'No' || h.housingSharesRoom === 'NO' || (!h.housingSharesRoom) ? 'X' : '&nbsp;'} ]</td>
                </tr>
                <tr>
                    <td colspan="2">Especifique: ${h.housingSharesRoomDesc || ''}</td>
                </tr>
                <tr>
                    <td colspan="2">
                        <strong>Personas que Habitan en la Vivienda</strong><br>
                        Adultos: &nbsp;&nbsp; Femenino: ${h.occupantsAdultsF ?? 0} &nbsp;&nbsp; Masculino: ${h.occupantsAdultsM ?? 0}<br>
                        Adolescentes: &nbsp;&nbsp; Femenino: ${h.occupantsTeensF ?? 0} &nbsp;&nbsp; Masculino: ${h.occupantsTeensM ?? 0}<br>
                        Niño: &nbsp;&nbsp; Femenino: ${h.occupantsChildrenF ?? 0} &nbsp;&nbsp; Masculino: ${h.occupantsChildrenM ?? 0}
                    </td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 14px;">HÁBITOS PSICOBIOLÓGICOS:</div>
            <table class="clinical-table">
                <tr>
                    <td class="col-label">Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.):</td>
                    <td>${h.addictions || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Manías Sociales (Tics, rutinas que maneje en un determinado espacio)</td>
                    <td>${h.socialManias || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Fobias o miedo intenso</td>
                    <td>${h.phobias || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Miedos nocturnos</td>
                    <td>${h.nightTerrors || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Ornicofagia</td>
                    <td>${h.ornicofagia || h.onychophagy || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Sueño</td>
                    <td>${h.sleepPattern || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Alimentación</td>
                    <td>${h.eatingPattern || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Higiene</td>
                    <td>${h.hygienePattern || ''}</td>
                </tr>
            </table>
        </div>
        <div class="page-footer">6</div>
    </div>

    <!-- ================= PÁGINA 7 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <table class="clinical-table" style="margin-top: 10px;">
                <tr>
                    <td class="col-label">Área Recreacional</td>
                    <td>${h.recreationArea || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Rutina Diaria</td>
                    <td>${h.dailyRoutine || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Metas a Corto y Mediano Plazo</td>
                    <td>${h.shortTermGoals || h.mediumTermGoals || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Metas a Largo Plazo</td>
                    <td>${h.longTermGoals || ''}</td>
                </tr>
            </table>

            <div class="signature-block">
                <div class="signature-line">FIRMA Y SELLO</div>
                <div style="margin-top: 6px; font-size: 9pt;">
                    <strong>${therapistName}</strong><br>
                    ${therapistTitle}<br>
                    ${therapistRegistry}
                </div>
            </div>
        </div>
        <div class="page-footer">7</div>
    </div>
</body>
</html>`;

        if (typeof window !== 'undefined' && window.open) {
            const printWin = window.open('', '_blank');
            if (printWin) {
                printWin.document.write(html);
                printWin.document.close();
                setTimeout(() => {
                    printWin.focus();
                    printWin.print();
                }, 400);
            }
        }
        return html;
    },

    // -------------------------------------------------------------
    // 5. EXPORTACIÓN PDF OFICIAL PROTOCOLIZADA CON MEMBRETE Y SELLO
    // -------------------------------------------------------------
    exportHistoriaOficialAdolescentePDF(patient, h, age, therapist) {
        const displayAge = h.age ? `${h.age} años` : (age ? `${age} años` : '');
        const therapistTitle = therapist.specialty || 'Psicólogo Mención Clínica';
        const therapistName = therapist.name || 'Lusmely Abreu';
        const therapistRegistry = therapist.registry || 'FPV 18.497';

        const therapistHeader = `
            <div class="official-header">
                <div class="psi-symbol">Ψ</div>
                <div class="therapist-badge">
                    ${therapistTitle}<br>
                    <strong>${therapistName}</strong><br>
                    ${therapistRegistry}
                </div>
            </div>
        `;

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>HISTORIA CLÍNICA ADOLESCENTE - ${patient.name}</title>
    <style>
        @page { size: letter; margin: 12mm 16mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.32; font-size: 10pt; margin: 0; padding: 0; background: #fff; }
        .official-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; border-bottom: 1px solid #000; padding-bottom: 4px; }
        .psi-symbol { font-size: 38pt; line-height: 1; font-family: serif; font-weight: normal; }
        .therapist-badge { text-align: right; font-size: 9.5pt; line-height: 1.25; font-family: 'Times New Roman', Times, serif; }
        h1.doc-title { text-align: center; font-size: 13pt; font-weight: bold; margin: 6px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .pre-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 9.5pt; }
        .chk-box { display: inline-block; border-bottom: 1px solid #000; width: 22px; text-align: center; font-weight: bold; }
        .section-title { font-weight: bold; text-transform: uppercase; font-size: 10pt; margin-top: 10px; margin-bottom: 3px; letter-spacing: 0.2px; }
        .field-row { margin-bottom: 4px; font-size: 9.5pt; line-height: 1.35; }
        .field-row strong { font-weight: bold; }
        .fill-line { display: inline-block; border-bottom: 1px solid #000; min-height: 13px; vertical-align: bottom; }
        table.clinical-table { width: 100%; border-collapse: collapse; margin-top: 2px; margin-bottom: 8px; font-size: 9.5pt; }
        table.clinical-table tr { page-break-inside: avoid; break-inside: avoid; }
        table.clinical-table th, table.clinical-table td { border: 1.2px solid #000; padding: 4px 6px; vertical-align: top; }
        table.clinical-table td.col-label { width: 42%; font-weight: normal; }
        .box-rect { border: 1.2px solid #000; padding: 6px 8px; min-height: 50px; margin-top: 2px; margin-bottom: 8px; font-size: 9.5pt; line-height: 1.35; }
        .box-lines { border-bottom: 1px solid #000; min-height: 24px; margin-top: 2px; margin-bottom: 6px; font-size: 9.5pt; line-height: 1.35; padding: 2px 0; }
        .pdf-page { page-break-after: always; break-after: page; min-height: 940px; box-sizing: border-box; position: relative; display: flex; flex-direction: column; }
        .pdf-page:last-child { page-break-after: avoid; break-after: avoid; }
        .page-content { flex: 1; }
        .page-footer { text-align: center; font-size: 10pt; margin-top: auto; padding-top: 10px; }
        .signature-block { margin-top: 50px; text-align: center; }
        .signature-line { width: 280px; margin: 0 auto; border-top: 1.5px solid #000; padding-top: 4px; font-weight: normal; letter-spacing: 0.6px; font-size: 9.5pt; }
        @media print { 
            body { padding: 0; }
            .pdf-page { page-break-after: always !important; break-after: page !important; }
            .pdf-page:last-child { page-break-after: avoid !important; break-after: avoid !important; }
        }
    </style>
</head>
<body>
    <!-- ================= PÁGINA 1 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            ${therapistHeader}

            <h1 class="doc-title">HISTORIA CLÍNICA ADOLESCENTE</h1>

            <div style="font-size: 8pt; color: #444; margin-bottom: 6px; display: flex; justify-content: space-between;">
                <span><strong>Estatus del Paciente:</strong> ${h.status || 'Por iniciar'}</span>
                <span><strong>Consentimiento Informado:</strong> ${h.guardianConsent === 'firmado' ? 'Firmado' : 'Consignado'}</span>
            </div>

            <div class="pre-row" style="margin-bottom: 10px;">
                <div>Ha asistido antes a Consulta Psicológica: NO <span class="chk-box">${h.hasAttendedBefore === 'NO' ? 'X' : '&nbsp;'}</span> &nbsp;&nbsp; SI <span class="chk-box">${h.hasAttendedBefore === 'SI' ? 'X' : '&nbsp;'}</span></div>
                <div>Fecha: <span class="fill-line" style="min-width: 90px; text-align: center;">${h.previousAttendanceDate || '/ &nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp; .'}</span></div>
            </div>

            <div class="section-title">IDENTIFICACIÓN DEL PACIENTE:</div>
            <div class="field-row"><strong>Nombre Completo:</strong> <span class="fill-line" style="min-width: 78%;">${patient.name || ''}</span></div>
            <div class="field-row"><strong>Lugar y Fecha de Nacimiento:</strong> <span class="fill-line" style="min-width: 52%;">${h.birthPlace || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp; <span class="fill-line" style="min-width: 90px; text-align: center;">${patient.birthdate ? patient.birthdate.split('-').reverse().join(' / ') : '/ &nbsp;&nbsp; /'}</span></div>
            <div class="field-row">
                <strong>Edad:</strong> <span class="fill-line" style="min-width: 50px; text-align: center;">${displayAge}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Sexo:</strong> <span class="fill-line" style="min-width: 70px; text-align: center;">${patient.gender || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Escolaridad:</strong> <span class="fill-line" style="min-width: 48%;">${patient.schoolGrade || h.schoolGrade || ''}</span>
            </div>
            <div class="field-row"><strong>Vive con:</strong> <span class="fill-line" style="min-width: 89%;">${h.livesWith || ''}</span></div>
            <div class="field-row"><strong>Domicilio:</strong> <span class="fill-line" style="min-width: 88%;">${h.address || patient.address || ''}</span></div>
            <div class="field-row"><strong>Referido:</strong> <span class="fill-line" style="min-width: 89%;">${h.referredBy || (Array.isArray(patient.referral) ? patient.referral.join(', ') : (patient.referral || ''))}</span></div>

            <div class="section-title" style="margin-top: 10px;">DATOS FILIATORIOS:</div>
            <div class="field-row"><strong>Nombre Completo de la Madre:</strong> <span class="fill-line" style="min-width: 66%;">${h.motherName || ''}</span></div>
            <div class="field-row">
                <strong>Edad:</strong> <span class="fill-line" style="min-width: 50px; text-align: center;">${h.motherAge || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>C.I:</strong> <span class="fill-line" style="min-width: 100px; text-align: center;">${h.motherCI || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Escolaridad:</strong> <span class="fill-line" style="min-width: 45%;">${h.motherEducation || ''}</span>
            </div>
            <div class="field-row"><strong>Ocupación:</strong> <span class="fill-line" style="min-width: 86%;">${h.motherJob || ''}</span></div>
            <div class="field-row"><strong>Domicilio:</strong> <span class="fill-line" style="min-width: 88%;">${h.motherAddress || ''}</span></div>

            <div class="field-row" style="margin-top: 6px;"><strong>Nombre Completo del Padre:</strong> <span class="fill-line" style="min-width: 67%;">${h.fatherName || ''}</span></div>
            <div class="field-row">
                <strong>Edad:</strong> <span class="fill-line" style="min-width: 50px; text-align: center;">${h.fatherAge || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>C.I:</strong> <span class="fill-line" style="min-width: 100px; text-align: center;">${h.fatherCI || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Escolaridad:</strong> <span class="fill-line" style="min-width: 45%;">${h.fatherEducation || ''}</span>
            </div>
            <div class="field-row"><strong>Ocupación:</strong> <span class="fill-line" style="min-width: 86%;">${h.fatherJob || ''}</span></div>
            <div class="field-row"><strong>Domicilio:</strong> <span class="fill-line" style="min-width: 88%;">${h.fatherAddress || ''}</span></div>

            <div class="field-row" style="margin-top: 8px;">
                <strong>Nº Hermanos:</strong> <span class="fill-line" style="min-width: 60px; text-align: center;">${h.siblingsCount ?? ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Nº Hermanastros</strong> <span class="fill-line" style="min-width: 60px; text-align: center;">${h.stepSiblingsCount ?? ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Nº Medio Hermanos:</strong> <span class="fill-line" style="min-width: 60px; text-align: center;">${h.halfSiblingsCount ?? ''}</span>
            </div>

            <div class="section-title" style="margin-top: 10px;">GENOGRAMA</div>
            <div class="box-rect" style="min-height: 85px;">
                ${h.genogramNotes || ''}
            </div>

            <div class="section-title">MOTIVO DE CONSULTA:</div>
            <div class="box-lines" style="min-height: 38px;">${patient.reason || ''}</div>

            <div class="section-title">GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICAR EL MOTIVO DE CONSULTA</div>
            <div class="box-lines" style="min-height: 30px;">${h.observedGestures || ''}</div>

            <div class="section-title">SINTOMATOLOGÍA PRESENTADA:</div>
            <div class="field-row"><strong>Características Conductuales:</strong> <span class="fill-line" style="min-width: 68%;">${h.symptomsBehavioral || ''}</span></div>
        </div>
        <div class="page-footer">1</div>
    </div>

    <!-- ================= PÁGINA 2 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <div class="field-row" style="margin-top: 10px;"><strong>Características Emocionales:</strong> <span class="fill-line" style="min-width: 70%;">${h.symptomsEmotional || ''}</span></div>
            <div class="box-lines" style="min-height: 24px;"></div>

            <div class="field-row" style="margin-top: 10px;"><strong>Características Orgánicas:</strong> <span class="fill-line" style="min-width: 72%;">${h.symptomsOrganic || ''}</span></div>
            <div class="box-lines" style="min-height: 24px;"></div>

            <div class="section-title" style="margin-top: 14px;">EXAMEN MENTAL:</div>
            <div class="box-lines" style="min-height: 60px;">${h.mentalExam || ''}</div>

            <div class="section-title" style="margin-top: 14px;">ANTECEDENTES</div>
            <table class="clinical-table">
                <tr>
                    <th colspan="2" style="text-align: center; font-weight: bold; padding: 5px;">Antecedentes Médicos del Paciente</th>
                </tr>
                <tr>
                    <td class="col-label">Evaluación Neurológica</td>
                    <td>${h.neuroEvaluation || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Golpes, caídas, lesiones, esguinces o fracturas.</td>
                    <td>${h.traumaInjuries || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Operaciones</td>
                    <td>${h.surgeries || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Convulsiones</td>
                    <td>${h.seizures || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Enfermedades que afectan el Sistema Inmunológico</td>
                    <td>${h.immuneDiseases || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Alergias</td>
                    <td>${h.allergies || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Tratamiento Actual</td>
                    <td>${h.medicalTreatment || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Otros antecedentes</td>
                    <td>${h.otherMedicalHistory || ''}</td>
                </tr>
                <tr>
                    <th colspan="2" style="text-align: center; font-weight: bold; padding: 5px;">Antecedentes Médicos Familiares</th>
                </tr>
                <tr>
                    <td colspan="2" style="min-height: 40px;">${h.familyMedicalHistory || ''}</td>
                </tr>
            </table>
        </div>
        <div class="page-footer">2</div>
    </div>

    <!-- ================= PÁGINA 3 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <table class="clinical-table" style="margin-top: 10px;">
                <tr>
                    <th colspan="2" style="text-align: center; font-weight: bold; padding: 5px;">Antecedentes Psiquiátricos o psicológicos del Paciente</th>
                </tr>
                <tr>
                    <td colspan="2" style="min-height: 38px;">${h.patientPsychiatricHistory || ''}</td>
                </tr>
                <tr>
                    <th colspan="2" style="text-align: center; font-weight: bold; padding: 5px;">Antecedentes Psiquiátricos o psicológicos Familiares</th>
                </tr>
                <tr>
                    <td colspan="2" style="min-height: 38px;">${h.familyPsychiatricHistory || ''}</td>
                </tr>
                <tr>
                    <th colspan="2" style="text-align: center; font-weight: bold; padding: 5px;">Evaluación o tratamiento Pedagógico Previo del Paciente</th>
                </tr>
                <tr>
                    <td colspan="2" style="min-height: 38px;">${h.pedagogicalHistory || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 12px;">DESARROLLO PRENATAL</div>
            <div class="pre-row" style="margin-bottom: 6px;">
                <div>Embarazo Deseado: SI <span class="chk-box">${h.pregnancyDesired === 'SI' ? 'X' : '&nbsp;'}</span> &nbsp;&nbsp; NO <span class="chk-box">${h.pregnancyDesired === 'NO' ? 'X' : '&nbsp;'}</span></div>
                <div>Embarazo Planificado: SI <span class="chk-box">${h.pregnancyPlanned === 'SI' ? 'X' : '&nbsp;'}</span> &nbsp;&nbsp; NO <span class="chk-box">${h.pregnancyPlanned === 'NO' ? 'X' : '&nbsp;'}</span></div>
            </div>
            <table class="clinical-table">
                <tr>
                    <td class="col-label">Desarrollo del feto durante el embarazo</td>
                    <td>${h.fetalDevelopment || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Estado emocional de la madre durante el embarazo</td>
                    <td>${h.motherEmotionalState || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Medicación Durante el Embarazo</td>
                    <td>${h.pregnancyMedication || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Enfermedades de la Madre Durante el Embarazo</td>
                    <td>${h.pregnancyDiseases || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Número de Embarazo de la Madre</td>
                    <td>${h.pregnancyNumber || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 10px;">DATOS DEL PARTO</div>
            <table class="clinical-table">
                <tr>
                    <td style="width: 50%;"><strong>Duración del Embarazo:</strong> ${h.pregnancyDuration || ''}</td>
                    <td style="width: 50%;"><strong>Duración del Parto:</strong> ${h.deliveryDuration || ''}</td>
                </tr>
                <tr>
                    <td colspan="2">
                        <strong>Tipo de Parto:</strong> &nbsp;&nbsp;
                        Espontáneo: [ ${h.deliveryType === 'Espontáneo' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp;&nbsp;&nbsp;
                        Inducido: [ ${h.deliveryType === 'Inducido' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp;&nbsp;&nbsp;
                        Cesárea: [ ${h.deliveryType === 'Cesárea' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp;&nbsp;&nbsp;
                        Natural: [ ${h.deliveryType === 'Natural' || (!h.deliveryType) ? 'X' : '&nbsp;'} ]
                    </td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 10px;">ESTADO DEL NIÑO AL NACER</div>
            <table class="clinical-table">
                <tr>
                    <td style="width: 50%;">Llanto al nacer: SI [ ${h.birthCry === 'SI' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp; NO [ ${h.birthCry === 'NO' ? 'X' : '&nbsp;'} ]</td>
                    <td style="width: 50%;">Posición del Bebé: ${h.babyPosition || ''}</td>
                </tr>
                <tr>
                    <td>Peso: ${h.birthWeight || ''}</td>
                    <td>Medida: ${h.birthLength || ''}</td>
                </tr>
                <tr>
                    <td>Reanimación: SI [ ${h.resuscitation === 'SI' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp; NO [ ${h.resuscitation === 'NO' ? 'X' : '&nbsp;'} ]</td>
                    <td>Incubadora: SI [ ${h.incubator === 'SI' ? 'X' : '&nbsp;'} ] &nbsp;&nbsp; NO [ ${h.incubator === 'NO' ? 'X' : '&nbsp;'} ]</td>
                </tr>
                <tr>
                    <td colspan="2">Primera alimentación: ${h.firstFeeding || ''}</td>
                </tr>
                <tr>
                    <td colspan="2">Otras Observaciones: ${h.birthObservations || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 14px; text-align: center;">DESARROLLO SOCIAL Y PSICOMOTOR DEL NIÑO ALREDEDOR DE LOS</div>
        </div>
        <div class="page-footer">3</div>
    </div>

    <!-- ================= PÁGINA 4 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <div class="section-title" style="margin-top: 10px; text-align: center;">PRIMEROS AÑOS DE VIDA</div>
            <table class="clinical-table">
                <tr>
                    <td class="col-label">Descripción de la alimentación durante los primeros meses de vida</td>
                    <td>${h.earlyFeedingDesc || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Descripción del proceso de destete</td>
                    <td>${h.weaningDesc || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Control o dureza cefálica</td>
                    <td>${h.headControl || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Edad a la que se sentó por primera vez</td>
                    <td>${h.sittingAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Gatear</td>
                    <td>${h.crawlingAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Primeros pasos</td>
                    <td>${h.firstStepsAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Primeras palabras</td>
                    <td>${h.firstWordsAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Primero dientes</td>
                    <td>${h.firstTeeth || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Control de esfínteres vesical y anal</td>
                    <td>${h.sphincterControl || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 14px;">ESCOLARIDAD</div>
            <table class="clinical-table">
                <tr>
                    <td class="col-label">Guardería o cuidadores</td>
                    <td>${h.daycareOrCaregivers || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Edad a la que comenzó la escolaridad</td>
                    <td>${h.schoolStartAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Proceso de adaptación a la escolaridad</td>
                    <td>${h.schoolAdaptation || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Relación con las maestras</td>
                    <td>${h.teacherRelation || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Amigos e interacción en la escuela</td>
                    <td>${h.schoolFriends || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Edad a la que aprendió a leer</td>
                    <td>${h.readingAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Edad a la que aprendió a escribir</td>
                    <td>${h.writingAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Edad a la que aprendió a contar</td>
                    <td>${h.countingAge || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Desarrollo en la primaria</td>
                    <td>${h.elementaryDevelopment || ''}</td>
                </tr>
            </table>
        </div>
        <div class="page-footer">4</div>
    </div>

    <!-- ================= PÁGINA 5 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <table class="clinical-table" style="margin-top: 10px;">
                <tr>
                    <td class="col-label">Áreas con mayor dificultad para su aprendizaje</td>
                    <td>${h.learningDifficulties || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Áreas con mayor facilidad para su aprendizaje</td>
                    <td>${h.learningStrengths || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Conducta en el colegio</td>
                    <td>${h.schoolBehavior || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Actitud al realizar actividades</td>
                    <td>${h.taskAttitude || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Personas con quien realizar actividades escolares en el hogar</td>
                    <td>${h.homeworkSupport || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 14px;">DINÁMICA FAMILIAR Y SOCIAL</div>
            <table class="clinical-table">
                <tr>
                    <td class="col-label">Conducta en el Hogar</td>
                    <td>${h.homeBehavior || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Conducta al Salir de Casa</td>
                    <td>${h.outdoorsBehavior || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Cosas que le gusta</td>
                    <td>${h.likes || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Cosas que le disgusta</td>
                    <td>${h.dislikes || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Descripción de la Dinámica Familiar</td>
                    <td>${h.familyDynamics || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 14px;">DESCRIPCIÓN DE ACUERDO A LA ENTEVISTA CON EL ADOLESCENTE</div>
            <table class="clinical-table">
                <tr>
                    <td class="col-label">Infancia</td>
                    <td>${h.teenChildhood || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Área Social</td>
                    <td>${h.teenSocial || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Área Sexual (Interés por Sexualidad o identificación de género)</td>
                    <td>${h.teenSexuality || ''}</td>
                </tr>
            </table>
        </div>
        <div class="page-footer">5</div>
    </div>

    <!-- ================= PÁGINA 6 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <table class="clinical-table" style="margin-top: 10px;">
                <tr>
                    <td class="col-label">Área Espiritual</td>
                    <td>${h.teenSpirituality || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Descripción de la Dinámica Familiar</td>
                    <td>${h.teenFamilyDynamics || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Relaciones Interpersonales (amistades y pareja)</td>
                    <td>${h.teenRelationships || ''}</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 14px;">ÁREA DE VIVIENDA</div>
            <table class="clinical-table">
                <tr>
                    <td style="width: 33%;">Apartamento ${h.housingType === 'Apartamento' ? '[X]' : '[ &nbsp; ]'}</td>
                    <td style="width: 33%;">Casa ${h.housingType === 'Casa' ? '[X]' : '[ &nbsp; ]'}</td>
                    <td>Otro ${h.housingType && !['Apartamento', 'Casa'].includes(h.housingType) ? '[X]' : '[ &nbsp; ]'}</td>
                </tr>
                <tr>
                    <td>Servicios Básicos</td>
                    <td>Sí ${h.housingServices === 'Sí' || h.housingServices === 'SI' ? '[X]' : '[ &nbsp; ]'}</td>
                    <td>No ${h.housingServices === 'No' || h.housingServices === 'NO' ? '[X]' : '[ &nbsp; ]'}</td>
                </tr>
                <tr>
                    <td>Comparte Habitación</td>
                    <td>Sí ${h.housingSharesRoom === 'Sí' || h.housingSharesRoom === 'SI' ? '[X]' : '[ &nbsp; ]'}</td>
                    <td>No ${h.housingSharesRoom === 'No' || h.housingSharesRoom === 'NO' ? '[X]' : '[ &nbsp; ]'}</td>
                </tr>
                <tr>
                    <td colspan="3"><strong>Especifique:</strong> ${h.housingSharesRoomDesc || '__________________________________________________'}</td>
                </tr>
                <tr>
                    <td rowspan="3" style="vertical-align: middle;"><strong>Personas que Habitan en la Vivienda</strong></td>
                    <td>Adultos</td>
                    <td>Femenino [ ${h.occupantsAdultsF ?? 0} ] &nbsp;&nbsp;&nbsp;&nbsp; Masculino [ ${h.occupantsAdultsM ?? 0} ]</td>
                </tr>
                <tr>
                    <td>Adolescentes</td>
                    <td>Femenino [ ${h.occupantsTeensF ?? 0} ] &nbsp;&nbsp;&nbsp;&nbsp; Masculino [ ${h.occupantsTeensM ?? 0} ]</td>
                </tr>
                <tr>
                    <td>Niño</td>
                    <td>Femenino [ ${h.occupantsChildrenF ?? 0} ] &nbsp;&nbsp;&nbsp;&nbsp; Masculino [ ${h.occupantsChildrenM ?? 0} ]</td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 14px;">HÁBITOS PSICOBIOLÓGICOS:</div>
            <table class="clinical-table">
                <tr>
                    <td class="col-label">Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.):</td>
                    <td>${h.addictions || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Manías Sociales (Tics, rutinas que maneje en un determinado espacio)</td>
                    <td>${h.socialManias || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Fobias o miedo intenso</td>
                    <td>${h.phobias || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Miedos nocturnos</td>
                    <td>${h.nightTerrors || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Ornicofagia</td>
                    <td>${h.ornicofagia || h.onychophagy || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Sueño</td>
                    <td>${h.sleepPattern || ''}</td>
                </tr>
            </table>
        </div>
        <div class="page-footer">6</div>
    </div>

    <!-- ================= PÁGINA 7 ================= -->
    <div class="pdf-page">
        <div class="page-content">
            <table class="clinical-table" style="margin-top: 10px;">
                <tr>
                    <td class="col-label">Alimentación</td>
                    <td>${h.eatingPattern || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Higiene</td>
                    <td>${h.hygienePattern || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Área Recreacional</td>
                    <td>${h.recreationArea || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Rutina Diaria</td>
                    <td>${h.dailyRoutine || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Metas a Corto y Mediano Plazo</td>
                    <td>${h.teenShortGoals || h.mediumTermGoals || h.shortTermGoals || ''}</td>
                </tr>
                <tr>
                    <td class="col-label">Metas a Largo Plazo</td>
                    <td>${h.teenLongGoals || h.longTermGoals || ''}</td>
                </tr>
            </table>

            <div class="signature-block">
                <div class="signature-line">
                    FIRMA Y SELLO
                </div>
                <div style="margin-top: 6px; font-size: 9.5pt; color: #222;">
                    ${therapistTitle} · <strong>${therapistName}</strong> (${therapistRegistry})
                </div>
                <div style="margin-top: 10px; font-size: 7.5pt; color: #555; text-align: justify; line-height: 1.25;">
                    Documento clínico confidencial amparado bajo el Código de Ética Profesional del Psicólogo (FPV) y el marco de protección integral LOPNNA. Cuenta con el correspondiente Asentimiento Informado del adolescente y autorización de los representantes legales.
                </div>
            </div>
        </div>
        <div class="page-footer">7</div>
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

    // -------------------------------------------------------------
    // 5.1 EXPORTACIÓN PDF OFICIAL EXCLUSIVA ADULTO (DISEÑO CONTINUO Y FLUIDO)
    // -------------------------------------------------------------
    exportHistoriaOficialAdultoPDF(patient, h, age, therapist) {
        const displayAge = h.age ? `${h.age} años` : (age ? `${age} años` : '');
        const therapistTitle = 'Psicólogo Mención Clínica';
        const therapistName = therapist.name || 'Lusmely Abreu';
        const therapistFPV = therapist.fpv ? `FPV ${therapist.fpv}` : (therapist.registry && therapist.registry.includes('FPV') ? therapist.registry : 'FPV 18.497');

        const therapistHeader = `
            <div class="official-header">
                <div class="psi-symbol">Ψ</div>
                <div class="therapist-badge">
                    ${therapistTitle}<br>
                    ${therapistName}<br>
                    ${therapistFPV}
                </div>
            </div>
        `;

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>HISTORIA CLÍNICA ADULTO - ${patient.name}</title>
    <style>
        @page { size: letter; margin: 12mm 16mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.32; font-size: 10pt; margin: 0; padding: 0; background: #fff; }
        .official-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; border-bottom: 1px solid #000; padding-bottom: 4px; }
        .psi-symbol { font-size: 38pt; line-height: 1; font-family: serif; font-weight: normal; }
        .therapist-badge { text-align: right; font-size: 9.5pt; line-height: 1.25; font-family: 'Times New Roman', Times, serif; }
        h1.doc-title { text-align: center; font-size: 13pt; font-weight: bold; margin: 6px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .pre-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 9.5pt; }
        .chk-box { display: inline-block; border-bottom: 1px solid #000; width: 20px; text-align: center; font-weight: bold; }
        .section-title { font-weight: bold; text-transform: uppercase; font-size: 10pt; margin-top: 10px; margin-bottom: 3px; letter-spacing: 0.2px; page-break-after: avoid; break-after: avoid; }
        .field-row { margin-bottom: 4px; font-size: 9.5pt; line-height: 1.35; }
        .field-row strong { font-weight: bold; }
        .fill-line { display: inline-block; border-bottom: 1px solid #000; min-height: 13px; vertical-align: bottom; }
        table.clinical-table { width: 100%; border-collapse: collapse; margin-top: 2px; margin-bottom: 8px; font-size: 9.5pt; }
        table.clinical-table tr { page-break-inside: avoid; break-inside: avoid; }
        table.clinical-table th, table.clinical-table td { border: 1.2px solid #000; padding: 4px 6px; vertical-align: top; }
        table.clinical-table td.col-label { width: 34%; font-weight: normal; }
        .box-rect { border: 1.2px solid #000; padding: 6px 8px; min-height: 48px; margin-top: 2px; margin-bottom: 8px; font-size: 9.5pt; line-height: 1.35; page-break-inside: avoid; break-inside: avoid; }
        .box-lines { border-bottom: 1px solid #000; min-height: 26px; margin-top: 2px; margin-bottom: 8px; font-size: 9.5pt; line-height: 1.35; padding: 2px 0; page-break-inside: avoid; break-inside: avoid; }
        .signature-block { margin-top: 24px; text-align: center; page-break-inside: avoid; break-inside: avoid; }
        .signature-line { width: 280px; margin: 0 auto; border-top: 1.5px solid #000; padding-top: 4px; font-weight: normal; letter-spacing: 0.6px; font-size: 9.5pt; }
        .footer-note { margin-top: 10px; text-align: center; font-size: 7.5pt; color: #555; page-break-inside: avoid; break-inside: avoid; }
        @media print { 
            body { padding: 0; }
        }
    </style>
</head>
<body>
    ${therapistHeader}

    <h1 class="doc-title">HISTORIA CLÍNICA ADULTO</h1>

    <div class="pre-row">
        <div>Ha asistido antes a Consulta Psicológica: NO <span class="chk-box">${h.hasAttendedBefore === 'NO' ? 'X' : '&nbsp;'}</span> &nbsp;&nbsp; SI <span class="chk-box">${h.hasAttendedBefore === 'SI' ? 'X' : '&nbsp;'}</span></div>
        <div>Fecha: <span class="fill-line" style="min-width: 90px; text-align: center;">${h.previousAttendanceDate || '/ &nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp; .'}</span></div>
    </div>

    <div class="section-title">IDENTIFICACIÓN DEL PACIENTE:</div>
    <div class="field-row"><strong>Nombre Completo:</strong> <span class="fill-line" style="min-width: 78%;">${patient.name || ''}</span></div>
    <div class="field-row"><strong>Lugar y Fecha de Nacimiento:</strong> <span class="fill-line" style="min-width: 52%;">${h.birthPlace || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp; <span class="fill-line" style="min-width: 90px; text-align: center;">${patient.birthdate ? patient.birthdate.split('-').reverse().join(' / ') : '/ &nbsp;&nbsp; /'}</span></div>
    <div class="field-row">
        <strong>Edad:</strong> <span class="fill-line" style="min-width: 50px; text-align: center;">${displayAge}</span> &nbsp;&nbsp;&nbsp;&nbsp;
        <strong>Sexo:</strong> <span class="fill-line" style="min-width: 65px; text-align: center;">${patient.gender || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
        <strong>Estado Civil:</strong> <span class="fill-line" style="min-width: 90px; text-align: center;">${patient.maritalStatus || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
        <strong>C.I:</strong> <span class="fill-line" style="min-width: 95px; text-align: center;">${h.ci || patient.ci || ''}</span>
    </div>
    <div class="field-row"><strong>Escolaridad:</strong> <span class="fill-line" style="min-width: 85%;">${patient.schoolGrade || patient.education || ''}</span></div>
    <div class="field-row"><strong>Ocupación:</strong> <span class="fill-line" style="min-width: 87%;">${patient.occupation || ''}</span></div>
    <div class="field-row"><strong>Religión:</strong> <span class="fill-line" style="min-width: 90%;">${h.religion || ''}</span></div>
    <div class="field-row"><strong>Vive con:</strong> <span class="fill-line" style="min-width: 89%;">${h.livesWith || patient.livesWith || ''}</span></div>
    <div class="field-row"><strong>Dirección:</strong> <span class="fill-line" style="min-width: 58%;">${h.address || patient.address || ''}</span> &nbsp;&nbsp; <strong>Teléfono:</strong> <span class="fill-line" style="min-width: 22%; text-align: center;">${patient.phone || ''}</span></div>
    <div class="field-row"><strong>Referido por:</strong> <span class="fill-line" style="min-width: 84%;">${h.referredBy || (Array.isArray(patient.referral) ? patient.referral.join(', ') : (patient.referral || ''))}</span></div>

    <div class="section-title" style="margin-top: 10px;">DATOS FILIATORIOS:</div>
    <div class="field-row">
        <strong>Nº Hermanos:</strong> <span class="fill-line" style="min-width: 70px; text-align: center;">${h.siblingsCount ?? ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <strong>Nº Hermanastros:</strong> <span class="fill-line" style="min-width: 70px; text-align: center;">${h.stepSiblingsCount ?? ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <strong>Nº Medio Hermanos:</strong> <span class="fill-line" style="min-width: 70px; text-align: center;">${h.halfSiblingsCount ?? ''}</span> .
    </div>

    <div class="section-title" style="margin-top: 10px;">GENOGRAMA</div>
    <div class="box-rect" style="min-height: 50px;">${h.genogramNotes || 'Diagrama y notas registradas en expediente digital.'}</div>

    <div class="section-title">MOTIVO DE CONSULTA</div>
    <div class="box-lines" style="min-height: 32px;">${patient.reason || ''}</div>

    <div class="section-title">GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICITAR MOTIVO DE CONSULTA</div>
    <div class="box-lines" style="min-height: 32px;">${h.observedGestures || ''}</div>

    <div class="section-title">EXAMEN MENTAL</div>
    <div class="box-lines" style="min-height: 38px;">${h.mentalExam || ''}</div>

    <div class="section-title" style="margin-top: 10px;">SINTOMATOLOGÍA PRESENTADA</div>
    <table class="clinical-table">
        <tr>
            <td class="col-label">Características Conductuales</td>
            <td>${h.symptomsBehavioral || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Características Emocionales</td>
            <td>${h.symptomsEmotional || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Características Orgánicas</td>
            <td>${h.symptomsOrganic || ''}</td>
        </tr>
    </table>

    <div class="section-title" style="margin-top: 10px;">ANTECEDENTES DEL PACIENTE</div>
    <table class="clinical-table">
        <tr>
            <td class="col-label">Evaluación Neurológica previa</td>
            <td>${h.neuroEvaluation || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Golpes, caídas, lesiones, esguinces o fracturas.</td>
            <td>${h.traumaInjuries || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Operaciones</td>
            <td>${h.surgeries || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Convulsiones</td>
            <td>${h.seizures || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Enfermedades que afectan el Sistema Inmunológico (Hepatitis, Viruela, etc.)</td>
            <td>${h.immuneDiseases || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Alergias</td>
            <td>${h.allergies || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Tratamiento Médico y otras patologías</td>
            <td>${h.medicalTreatment || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Antecedentes Médicos Familiares</td>
            <td>${h.familyMedicalHistory || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Antecedentes Psiquiátricos o psicológicos del Paciente</td>
            <td>${h.patientPsychiatricHistory || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Antecedentes Psiquiátricos o psicológicos Familiares</td>
            <td>${h.familyPsychiatricHistory || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Infancia</td>
            <td>${h.adultInfancyHistory || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Adolescencia</td>
            <td>${h.adultAdolescenceHistory || ''}</td>
        </tr>
    </table>

    <div class="section-title" style="margin-top: 10px;">SITUACIÓN ACTUAL</div>
    <table class="clinical-table">
        <tr>
            <td class="col-label">Área Social y Relaciones Interpersonales</td>
            <td>${h.adultSocial || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Dinámica Familiar</td>
            <td>${h.adultFamilyDynamics || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Área Espiritual</td>
            <td>${h.adultSpirituality || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Área Sexual</td>
            <td>${h.adultSexual || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Área Laboral</td>
            <td>${h.adultWork || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Aspectos Legales</td>
            <td>${h.adultLegal || ''}</td>
        </tr>
    </table>

    <div class="section-title" style="margin-top: 10px;">ÁREA DE VIVIENDA</div>
    <table class="clinical-table">
        <tr>
            <td style="width: 33%;">Apartamento ${h.housingType === 'Apartamento' ? '[X]' : '[ &nbsp; ]'}</td>
            <td style="width: 33%;">Casa ${h.housingType === 'Casa' ? '[X]' : '[ &nbsp; ]'}</td>
            <td>Otro ${h.housingType && !['Apartamento', 'Casa'].includes(h.housingType) ? '[X]' : '[ &nbsp; ]'}</td>
        </tr>
        <tr>
            <td>Servicios Básicos</td>
            <td>Sí ${h.housingServices === 'Sí' || h.housingServices === 'SI' ? '[X]' : '[ &nbsp; ]'}</td>
            <td>No ${h.housingServices === 'No' || h.housingServices === 'NO' ? '[X]' : '[ &nbsp; ]'}</td>
        </tr>
        <tr>
            <td>Comparte Habitación</td>
            <td>Sí ${h.housingSharesRoom === 'Sí' || h.housingSharesRoom === 'SI' ? '[X]' : '[ &nbsp; ]'}</td>
            <td>No ${h.housingSharesRoom === 'No' || h.housingSharesRoom === 'NO' ? '[X]' : '[ &nbsp; ]'}</td>
        </tr>
        <tr>
            <td colspan="3"><strong>Especifique:</strong> ${h.housingSharesRoomDesc || '__________________________________________________'}</td>
        </tr>
        <tr>
            <td rowspan="3" style="vertical-align: middle;"><strong>Personas que Habitan en la Vivienda</strong></td>
            <td>Adultos</td>
            <td>Femenino [ ${h.occupantsAdultsF ?? 0} ] &nbsp;&nbsp;&nbsp;&nbsp; Masculino [ ${h.occupantsAdultsM ?? 0} ]</td>
        </tr>
        <tr>
            <td>Adolescentes</td>
            <td>Femenino [ ${h.occupantsTeensF ?? 0} ] &nbsp;&nbsp;&nbsp;&nbsp; Masculino [ ${h.occupantsTeensM ?? 0} ]</td>
        </tr>
        <tr>
            <td>Niño</td>
            <td>Femenino [ ${h.occupantsChildrenF ?? 0} ] &nbsp;&nbsp;&nbsp;&nbsp; Masculino [ ${h.occupantsChildrenM ?? 0} ]</td>
        </tr>
    </table>

    <div class="section-title" style="margin-top: 10px;">HÁBITOS PSICOBIOLÓGICOS:</div>
    <table class="clinical-table">
        <tr>
            <td class="col-label">Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.):</td>
            <td>${h.addictions || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Manías Sociales (Tics, rutinas que maneje en un determinado espacio)</td>
            <td>${h.socialManias || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Fobias o Miedo Intenso</td>
            <td>${h.phobias || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Miedos Nocturnos</td>
            <td>${h.nightTerrors || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Ornicofagia</td>
            <td>${h.onychophagy || h.ornicofagia || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Sueño</td>
            <td>${h.sleepPattern || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Alimentación</td>
            <td>${h.eatingPattern || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Higiene</td>
            <td>${h.hygienePattern || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Área Recreacional</td>
            <td>${h.recreationArea || ''}</td>
        </tr>
        <tr>
            <td class="col-label">Rutina Diaria</td>
            <td>${h.dailyRoutine || ''}</td>
        </tr>
    </table>

    <div class="section-title" style="margin-top: 10px;">METAS Y PROYECTO DE VIDA</div>
    <table class="clinical-table">
        <tr>
            <td class="col-label">Metas a Mediano Plazo</td>
            <td>${h.mediumTermGoals || 'En proceso de delimitación'}</td>
        </tr>
        <tr>
            <td class="col-label">Metas a Largo Plazo</td>
            <td>${h.longTermGoals || 'En proceso de delimitación'}</td>
        </tr>
    </table>

    <div class="signature-block">
        <div class="signature-line">
            FIRMA Y SELLO
        </div>
        <div style="margin-top: 4px; font-size: 9.5pt; color: #222;">
            ${therapistTitle} · <strong>${therapistName}</strong> (${therapistFPV})
        </div>
    </div>

    <div class="footer-note">
        Expediente confidencial · Código de Ética Profesional del Psicólogo (FPV)
    </div>
    <!-- Contacto de Emergencia: ${h.emergencyContactName ? `${h.emergencyContactName} (${h.emergencyContactRelation || ''})` : ''} -->
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

        if (cat === 'child') {
            return this.exportHistoriaOficialInfantilPDF(patient, h, age, therapist);
        }
        if (cat === 'adolescent') {
            return this.exportHistoriaOficialAdolescentePDF(patient, h, age, therapist);
        }
        if (cat === 'adult') {
            return this.exportHistoriaOficialAdultoPDF(patient, h, age, therapist);
        }

        const isAdult = cat === 'adult';
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

    <div class="section-header">DATOS DE IDENTIFICACIÓN DEL PACIENTE:</div>
    <table class="clinical-table">
        <tr>
            <td ${cat === 'child' ? 'colspan="3"' : 'colspan="2"'}><strong>Nombre Completo del Paciente:</strong> ${patient.name}</td>
            ${cat !== 'child' ? `<td><strong>C.I.:</strong> ${h.ci || '—'}</td>` : ''}
        </tr>
        <tr>
            <td><strong>Lugar y Fecha de Nac.:</strong> ${h.birthPlace || 'No esp.'} · ${patient.birthdate || '—'}</td>
            <td><strong>Edad:</strong> ${age ? age + ' años' : '—'}</td>
            <td><strong>Sexo / Género:</strong> ${patient.gender || '—'}</td>
        </tr>
        <tr>
            <td><strong>Escolaridad / Nivel:</strong> ${patient.schoolGrade || patient.education || (isAdult ? 'Universitaria / Técnico / Superior' : 'Educación Básica')}</td>
            <td><strong>Ocupación:</strong> ${patient.occupation || (isAdult ? 'Profesional / Empleado' : 'Estudiante')}</td>
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
            <td colspan="3"><strong>Contacto de Emergencia:</strong> ${h.emergencyContactName ? `${h.emergencyContactName} (${h.emergencyContactRelation || 'Familiar'}) · Tel: ${h.emergencyContactPhone || '—'}` : 'No registrado'}</td>
        </tr>
        <tr>
            <td colspan="3"><strong>Referido por:</strong> ${h.referredBy || 'Deseabilidad propia'}</td>
        </tr>
    </table>

    <div class="section-header">DATOS FILIATORIOS DE LOS PADRES:</div>
    <table class="clinical-table">
        <tr>
            <td><strong>Madre:</strong> ${h.motherName || '—'}</td>
            <td><strong>Edad:</strong> ${h.motherAge ? h.motherAge + ' años' : '—'}</td>
            <td><strong>C.I.:</strong> ${h.motherCI || '—'}</td>
            <td><strong>Escolaridad:</strong> ${h.motherEducation || '—'}</td>
            <td><strong>Ocupación Actual:</strong> ${h.motherJob || '—'}</td>
        </tr>
        <tr>
            <td><strong>Padre:</strong> ${h.fatherName || '—'}</td>
            <td><strong>Edad:</strong> ${h.fatherAge ? h.fatherAge + ' años' : '—'}</td>
            <td><strong>C.I.:</strong> ${h.fatherCI || '—'}</td>
            <td><strong>Escolaridad:</strong> ${h.fatherEducation || '—'}</td>
            <td><strong>Ocupación Actual:</strong> ${h.fatherJob || '—'}</td>
        </tr>
        <tr>
            <td colspan="5">
                <strong>Nº Hermanos:</strong> ${h.siblingsCount} &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Nº Hermanastros:</strong> ${h.stepSiblingsCount} &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Nº Medio Hermanos:</strong> ${h.halfSiblingsCount}
            </td>
        </tr>
    </table>

    <div class="section-header">MOTIVO DE CONSULTA (MANIFIESTO):</div>
    <div class="box-container">${patient.reason || 'Sin motivo registrado.'}</div>

    ${h.currentIllness ? `
    <div class="section-header">SITUACIÓN / ENFERMEDAD ACTUAL (CRONOLOGÍA E IMPACTO):</div>
    <div class="box-container">${h.currentIllness}</div>` : ''}

    <div class="section-header">GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICITAR MOTIVO DE CONSULTA:</div>
    <div class="box-container">${h.observedGestures || 'Paciente colaborador, tono de voz adecuado, congruente con el afecto.'}</div>

    <div class="page-break"></div>

    <!-- PÁGINA 2 -->
    <div class="official-header">
        <div class="psi-symbol">Ψ</div>
        <div class="therapist-badge">${therapist.specialty}<br><strong>${therapist.name}</strong> · ${therapist.registry}</div>
    </div>

    <div class="section-header">EXAMEN MENTAL (SEMIOLOGÍA PSICOPATOLÓGICA):</div>
    <div class="box-container">${h.mentalExam || 'Paciente orientado en tiempo, espacio y persona. Memoria y juicio conservados, discurso coherente, afecto modulado. Sin alteraciones sensoperceptivas agudas.'}</div>
    <table class="clinical-table">
        <tr>
            <td><strong>Orientación / Conciencia:</strong> ${h.mentalOrientation || 'Orientado en las 3 esferas (tiempo, espacio, persona)'}</td>
            <td><strong>Atención y Memoria:</strong> ${h.mentalAttention || 'Euprosexia y memoria de fijación/evocación conservada'}</td>
        </tr>
        <tr>
            <td><strong>Pensamiento (Curso y Contenido):</strong> ${h.mentalThought || 'Curso fluido, coherente, sin ideación delirante'}</td>
            <td><strong>Descarte Riesgo Autolítico:</strong> ${h.mentalSuicidalRisk || 'Descartado / Negativo en la exploración'}</td>
        </tr>
        <tr>
            <td><strong>Afectividad / Humor:</strong> ${h.mentalAffect || 'Eutimia / Resonancia afectiva adecuada'}</td>
            <td><strong>Juicio e Insight:</strong> ${h.mentalJudgment || 'Juicio de realidad conservado, introspección adecuada'}</td>
        </tr>
    </table>

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
    <!-- PÁGINA 3 (INFANTIL): PERINATAL, PARTO Y ESCOLARIDAD -->
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

    <div class="section-header">ESCOLARIDAD, RENDIMIENTO Y ADAPTACIÓN (ÁREA PEDAGÓGICA):</div>
    <table class="clinical-table">
        <tr><td><strong>Institución Educativa:</strong> ${patient.schoolName || 'No registrada'}</td><td><strong>Grado / Nivel:</strong> ${patient.schoolGrade || h.schoolGrade || 'No registrado'}</td></tr>
        <tr><td colspan="2"><strong>Adaptación y Conducta Escolar:</strong> ${h.schoolAdaptation || 'Adaptación favorable'} · ${h.schoolBehavior || 'Conducta acorde al encuadre escolar'}</td></tr>
        <tr><td><strong>Dificultades de Aprendizaje:</strong> ${h.learningDifficulties || 'Ninguna referida'}</td><td><strong>Facilidades / Fortalezas:</strong> ${h.learningStrengths || 'Lenguaje y creatividad'}</td></tr>
        <tr><td colspan="2"><strong>Apoyo en Tareas en el Hogar:</strong> ${h.homeworkSupport || 'Madre / Familia'}</td></tr>
    </table>
    ` : `
    <div class="section-header">ÁREAS DE DESEMPEÑO EN LA VIDA ADULTA:</div>
    <table class="clinical-table">
        <tr><td><strong>Área Laboral / Ocupacional:</strong> ${h.adultWork || patient.occupation || 'Activo laboralmente'}</td><td><strong>Área Afectiva y Pareja:</strong> ${h.adultSexual || 'Sin disfunciones reportadas'}</td></tr>
        <tr><td><strong>Dinámica Familiar y Convivencia:</strong> ${h.adultFamilyDynamics || 'Convivencia armónica'}</td><td><strong>Red de Apoyo Social:</strong> ${h.adultSocial || 'Red social activa'}</td></tr>
        <tr><td><strong>Área Espiritual / Valores:</strong> ${h.adultSpirituality || 'Valores personales integrados'}</td><td><strong>Aspectos Legales:</strong> ${h.adultLegal || 'Sin antecedentes ni litigios judiciales'}</td></tr>
    </table>
    `}

    <div class="section-header" style="margin-top:16px;">HÁBITOS PSICOBIOLÓGICOS Y SUEÑO:</div>
    <table class="clinical-table">
        <tr><td><strong>Adicciones / Consumos:</strong> ${h.addictions || 'Negativo'}</td><td><strong>Manías / Tics:</strong> ${h.socialManias || 'Ninguno'}</td></tr>
        <tr><td><strong>Fobias / Miedos intensos:</strong> ${h.phobias || 'No refiere'}</td><td><strong>Miedos Nocturnos:</strong> ${h.nightTerrors || 'No presenta'}</td></tr>
        <tr><td><strong>Onicofagia:</strong> ${h.onychophagy || 'No presenta'}</td><td><strong>Sueño:</strong> ${h.sleepPattern || 'Patrón normal reparador'}</td></tr>
        <tr><td><strong>Alimentación:</strong> ${h.eatingPattern || 'Regular'}</td><td><strong>Higiene:</strong> ${h.hygienePattern || 'Adecuada'}</td></tr>
    </table>

    <div class="section-header">IMPRESIÓN DIAGNÓSTICA (CIE-10 / CIE-11 & DSM-5-TR):</div>
    <div class="box-container">${h.diagnosticImpression || patient.diagnosis || 'En proceso de evaluación diagnóstica integral.'}</div>

    <div class="section-header">PLAN TERAPÉUTICO Y METAS DE INTERVENCIÓN:</div>
    <div class="box-container">${h.treatmentPlan || patient.treatmentPlan || patient.goals || 'Objetivos clínicos de fortalecimiento cognitivo, autorregulación y psicoeducación.'}</div>

    <div class="footer-seal">
        <br><br>
        <div class="seal-line">
            FIRMA Y SELLO PROFESIONAL<br>
            ${therapist.name}<br>
            <span style="font-size:9pt; font-weight:normal;">${therapist.specialty} · ${therapist.registry}</span>
        </div>
        <p style="font-size:8pt; color:#555; margin-top:8px;">Documento confidencial bajo secreto profesional. Ley de Ejercicio de la Psicología (Gaceta Nº 2.306 Extraordinario) y Código de Ética Profesional del Psicólogo de la Federación de Psicólogos de Venezuela (FPV). Conforme a la LOPNNA en personas menores de 18 años.</p>
    </div>

    <script>window.onload = () => window.print();</script>
</body>
</html>`;

        if (typeof window !== 'undefined' && typeof window.open === 'function') {
            const w = window.open('', '_blank');
            if (w) {
                w.document.write(html);
                w.document.close();
            } else if (typeof showToast === 'function') {
                showToast('Permita las ventanas emergentes para ver el PDF oficial', 'warning');
            }
        }
        return html;
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
            FIRMA Y SELLO PROFESIONAL<br>
            ${therapist.name} · ${therapist.registry}
        </div>
        <p style="font-size:7.5pt; color:#666; margin-top:6px;">Reporte de atención confidencial bajo secreto profesional. Ley de Ejercicio de la Psicología y Código de Ética Profesional del Psicólogo (FPV).</p>
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
                                Diligencie las preguntas de encuadre aquí mismo en SERENA sin salir a otra página. Guarda e integra los datos de inmediato al expediente.
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
                            <div class="form-group" style="flex:1; display:${initialStage === 'child' ? 'none' : 'block'};" id="inapp_ci_wrapper">
                                <label>Cédula de Identidad</label>
                                <input type="text" id="inapp_patientCI" placeholder="V- / E-">
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
                                    <label>Escolaridad</label>
                                    <input type="text" id="inapp_motherEducation" placeholder="Escolaridad madre">
                                </div>
                                <div class="form-group" style="flex:1.5;">
                                    <label>Ocupación Actual</label>
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
                                    <label>Escolaridad</label>
                                    <input type="text" id="inapp_fatherEducation" placeholder="Escolaridad padre">
                                </div>
                                <div class="form-group" style="flex:1.5;">
                                    <label>Ocupación Actual</label>
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
        const ciWrap = document.getElementById('inapp_ci_wrapper');

        if (ciWrap) {
            ciWrap.style.display = stage === 'child' ? 'none' : 'block';
        }

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
        setVal('inapp_motherEducation', patient.motherEducation);
        setVal('inapp_motherJob', patient.motherJob);
        setVal('inapp_fatherName', patient.fatherName);
        setVal('inapp_fatherAge', patient.fatherAge);
        setVal('inapp_fatherCI', patient.fatherCI);
        setVal('inapp_fatherEducation', patient.fatherEducation);
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
            motherEducation: getV('inapp_motherEducation'),
            motherJob: getV('inapp_motherJob'),
            fatherName: getV('inapp_fatherName'),
            fatherAge: getV('inapp_fatherAge'),
            fatherCI: getV('inapp_fatherCI'),
            fatherEducation: getV('inapp_fatherEducation'),
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
