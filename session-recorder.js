/**
 * PSICO NOTES CLINICAL v7.0 - MÓDULO DE GRABACIÓN Y COPILOTO AMBIENTAL DE SESIÓN
 * Inspirado en el benchmark de productividad clínica de HeyFreud (app.heyfreud.com).
 * 
 * Características:
 * - Captura de audio ambiental en segundo plano (MediaRecorder WebM/Opus).
 * - Monitorización volumétrica VU-meter en tiempo real (Web Audio API Analyser).
 * - Barra flotante de control ergonómica con cronómetro, pausa y finalización.
 * - Garantía Ética Zero-Retention: El audio reside únicamente en memoria volátil
 *   y es destruido de forma irreversible tras la síntesis de la nota clínica.
 */

const SessionRecorder = {
    mediaRecorder: null,
    audioChunks: [],
    stream: null,
    audioContext: null,
    analyser: null,
    analyserRafId: null,
    timerInterval: null,
    secondsElapsed: 0,
    isRecording: false,
    isPaused: false,
    activePatientId: null,
    activePatientName: '',
    selectedFormat: 'SOAP',
    statusCallbacks: new Set(),
    vuMeterCallbacks: new Set(),

    isSupported() {
        return Boolean(
            typeof window !== 'undefined' &&
            window.navigator &&
            window.navigator.mediaDevices &&
            typeof window.navigator.mediaDevices.getUserMedia === 'function' &&
            typeof window.MediaRecorder === 'function'
        );
    },

    onStatusChange(cb) {
        if (typeof cb === 'function') this.statusCallbacks.add(cb);
    },

    offStatusChange(cb) {
        this.statusCallbacks.delete(cb);
    },

    onVuMeter(cb) {
        if (typeof cb === 'function') this.vuMeterCallbacks.add(cb);
    },

    notifyStatus() {
        const state = {
            isRecording: this.isRecording,
            isPaused: this.isPaused,
            secondsElapsed: this.secondsElapsed,
            formattedTime: this.formatTime(this.secondsElapsed),
            patientId: this.activePatientId,
            patientName: this.activePatientName,
            selectedFormat: this.selectedFormat
        };
        this.statusCallbacks.forEach(cb => {
            try { cb(state); } catch {}
        });
        this.updateFloatingWidget(state);
    },

    formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },

    async start(patientId = null, patientName = '', format = 'SOAP') {
        if (!this.isSupported()) {
            if (typeof showToast === 'function') {
                showToast('La grabación de sesión requiere un navegador moderno con soporte para micrófono (Chrome, Edge, Safari o Firefox).', 'warning');
            }
            return false;
        }

        if (this.isRecording) {
            console.warn('Ya existe una sesión de grabación activa.');
            return false;
        }

        try {
            this.purgeAudio();
            this.activePatientId = patientId;
            this.activePatientName = patientName || (patientId ? 'Paciente en consulta' : 'Consulta general');
            this.selectedFormat = format || 'SOAP';
            this.secondsElapsed = 0;

            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                    channelCount: 1
                }
            });

            this.stream = audioStream;

            // Configurar Analyser para el VU meter en vivo
            this.setupAudioAnalyser(audioStream);

            // Determinar mimeType compatible
            let mimeType = 'audio/webm;codecs=opus';
            if (typeof MediaRecorder.isTypeSupported === 'function') {
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
                    else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
                    else mimeType = '';
                }
            }

            const recorderOptions = mimeType ? { mimeType } : undefined;
            this.mediaRecorder = new MediaRecorder(audioStream, recorderOptions);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            };

            this.mediaRecorder.onstart = () => {
                this.isRecording = true;
                this.isPaused = false;
                this.startTimer();
                this.showFloatingWidget();
                this.notifyStatus();
                if (typeof showToast === 'function') {
                    showToast(`🎙️ Grabación ambiental de sesión iniciada (${this.selectedFormat})`, 'info');
                }
            };

            this.mediaRecorder.onerror = (e) => {
                console.error('Error en MediaRecorder:', e);
                this.stop();
            };

            // Recolectar datos en bloques de 5 segundos para fluidez de memoria
            this.mediaRecorder.start(5000);
            return true;
        } catch (err) {
            console.error('No se pudo acceder al micrófono para la sesión:', err);
            if (typeof showToast === 'function') {
                showToast('Permiso de micrófono denegado o dispositivo ocupado.', 'error');
            }
            return false;
        }
    },

    setupAudioAnalyser(stream) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.audioContext = new AudioCtx();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 64;
            source.connect(this.analyser);

            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            const checkVolume = () => {
                if (!this.isRecording || this.isPaused) {
                    this.updateVuVisual(0);
                    return;
                }
                this.analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                const normalized = Math.min(100, Math.round((avg / 128) * 100));
                this.updateVuVisual(normalized);
                this.vuMeterCallbacks.forEach(cb => {
                    try { cb(normalized); } catch {}
                });
                this.analyserRafId = requestAnimationFrame(checkVolume);
            };
            this.analyserRafId = requestAnimationFrame(checkVolume);
        } catch (e) {
            console.warn('AudioContext no inicializado para VU meter:', e);
        }
    },

    updateVuVisual(level) {
        if (typeof document === 'undefined') return;
        const bar = document.getElementById('sessionRecorderVuBar');
        if (bar) {
            bar.style.width = `${level}%`;
            bar.style.backgroundColor = level > 75 ? '#ef4444' : (level > 40 ? '#10b981' : '#0d9488');
        }
    },

    startTimer() {
        this.clearTimer();
        this.timerInterval = setInterval(() => {
            if (this.isRecording && !this.isPaused) {
                this.secondsElapsed++;
                const timerEl = document.getElementById('sessionRecorderTimer');
                if (timerEl) {
                    timerEl.textContent = this.formatTime(this.secondsElapsed);
                }
            }
        }, 1000);
    },

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    pause() {
        if (this.mediaRecorder && this.isRecording && !this.isPaused) {
            try {
                this.mediaRecorder.pause();
                this.isPaused = true;
                this.notifyStatus();
                if (typeof showToast === 'function') {
                    showToast('Grabación de sesión pausada.', 'info');
                }
            } catch (e) {
                console.error('Error al pausar grabación:', e);
            }
        }
    },

    resume() {
        if (this.mediaRecorder && this.isRecording && this.isPaused) {
            try {
                this.mediaRecorder.resume();
                this.isPaused = false;
                this.notifyStatus();
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                if (typeof showToast === 'function') {
                    showToast('Grabación de sesión reanudada.', 'info');
                }
            } catch (e) {
                console.error('Error al reanudar grabación:', e);
            }
        }
    },

    togglePause() {
        if (this.isPaused) this.resume();
        else this.pause();
    },

    async stop() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || !this.isRecording) {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = async () => {
                this.clearTimer();
                if (this.analyserRafId) {
                    cancelAnimationFrame(this.analyserRafId);
                    this.analyserRafId = null;
                }
                if (this.audioContext) {
                    try { this.audioContext.close(); } catch {}
                    this.audioContext = null;
                }

                const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                const duration = this.secondsElapsed;

                // Convertir a base64 para envío al proxy clínico
                let audioBase64 = null;
                try {
                    audioBase64 = await this.blobToBase64(audioBlob);
                } catch (bErr) {
                    console.warn('Error convirtiendo audio a base64:', bErr);
                }

                const result = {
                    audioBlob,
                    audioBase64,
                    durationSeconds: duration,
                    mimeType,
                    patientId: this.activePatientId,
                    patientName: this.activePatientName,
                    format: this.selectedFormat
                };

                this.isRecording = false;
                this.isPaused = false;
                this.hideFloatingWidget();
                this.notifyStatus();

                resolve(result);
            };

            try {
                this.mediaRecorder.stop();
            } catch (e) {
                console.error('Error al detener MediaRecorder:', e);
                resolve(null);
            }
        });
    },

    cancel() {
        if (this.isRecording) {
            if (this.mediaRecorder) {
                try {
                    this.mediaRecorder.onstop = null;
                    this.mediaRecorder.stop();
                } catch {}
            }
        }
        this.clearTimer();
        this.purgeAudio();
        this.hideFloatingWidget();
        this.notifyStatus();
        if (typeof showToast === 'function') {
            showToast('Grabación de sesión descartada.', 'info');
        }
    },

    purgeAudio() {
        if (this.stream) {
            try {
                this.stream.getTracks().forEach(t => t.stop());
            } catch {}
            this.stream = null;
        }
        if (this.audioChunks) {
            this.audioChunks.length = 0;
            this.audioChunks = [];
        }
        if (this.audioContext) {
            try { this.audioContext.close(); } catch {}
            this.audioContext = null;
        }
        this.mediaRecorder = null;
        this.isRecording = false;
        this.isPaused = false;
    },

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    const base64Data = reader.result.split(',')[1] || '';
                    resolve(base64Data);
                } else {
                    resolve('');
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    // ============================================
    // INTEGRACIÓN CON SÍNTESIS CLÍNICA IA
    // ============================================

    async finishAndSynthesizeNote() {
        if (!this.isRecording) return;
        const currentPatientId = this.activePatientId;
        const currentFormat = this.selectedFormat || 'SOAP';

        if (typeof showToast === 'function') {
            showToast('Finalizando grabación y sintetizando nota clínica con IA...', 'info');
        }

        const sessionData = await this.stop();
        if (!sessionData) {
            if (typeof showToast === 'function') {
                showToast('No se obtuvieron datos de la grabación.', 'error');
            }
            return;
        }

        // Obtener contexto del paciente
        let patientInfo = {};
        if (typeof AppState !== 'undefined' && Array.isArray(AppState.patients)) {
            const found = AppState.patients.find(p => p.id === currentPatientId);
            if (found) {
                patientInfo = {
                    name: found.name,
                    diagnosis: found.diagnosis,
                    reason: found.reason || found.consultationReason,
                    stage: found.stage || found.lifeStage
                };
            }
        }

        try {
            if (typeof ClinicalAI === 'undefined' || typeof ClinicalAI.synthesizeSessionNote !== 'function') {
                throw new Error('Módulo ClinicalAI no disponible para síntesis multiformato.');
            }

            const synthesisResult = await ClinicalAI.synthesizeSessionNote(
                { audioBase64: sessionData.audioBase64, mimeType: sessionData.mimeType },
                { format: currentFormat, patientInfo }
            );

            // Garantía Ética Zero-Retention: destruimos el audio una vez procesado
            this.purgeAudio();

            // Desplegar modal de borrador clínico para revisión y firma
            this.openReviewModal(synthesisResult, currentPatientId);

        } catch (err) {
            console.error('Error al sintetizar sesión con IA:', err);
            // Destrucción de audio de todas formas para cumplir privacidad
            this.purgeAudio();

            if (typeof showToast === 'function') {
                showToast(`Error al procesar sesión: ${err.message}`, 'error');
            }
        }
    },

    openReviewModal(synthesisResult, patientId) {
        const format = synthesisResult.format || 'SOAP';
        const content = synthesisResult.content || {};

        if (typeof window.openSessionSynthesizedDraftModal === 'function') {
            window.openSessionSynthesizedDraftModal(format, content, patientId);
            return;
        }

        // Fallback: abrir modal de nota regular
        if (typeof window.openNoteModal === 'function') {
            window.openNoteModal(patientId);
            setTimeout(() => {
                const noteSubj = document.getElementById('noteSubjetivo') || document.getElementById('noteSubjective');
                if (content.subjetivo && noteSubj) {
                    noteSubj.value = content.subjetivo;
                }
                const noteObj = document.getElementById('noteObjetivo') || document.getElementById('noteObjective');
                if (content.objetivo && noteObj) {
                    noteObj.value = content.objetivo;
                }
                const noteAnal = document.getElementById('noteAnalisis') || document.getElementById('noteAssessment');
                if (content.analisis && noteAnal) {
                    noteAnal.value = content.analisis;
                }
                const notePl = document.getElementById('notePlan');
                if (content.plan && notePl) {
                    notePl.value = content.plan;
                }
            }, 300);
        }
    },

    // ============================================
    // BARRA FLOTANTE EN VIVO (WIDGET DE CONTROL)
    // ============================================

    ensureWidgetInDOM() {
        if (typeof document === 'undefined') return;
        if (document.getElementById('sessionRecorderFloatingBar')) return;

        const widget = document.createElement('div');
        widget.id = 'sessionRecorderFloatingBar';
        widget.className = 'session-recorder-floating-bar';
        widget.style.display = 'none';

        widget.innerHTML = `
            <div class="srf-inner">
                <div class="srf-status-pill">
                    <span class="srf-indicator-dot pulse"></span>
                    <span class="srf-label">SESIÓN ACTIVA</span>
                    <span id="sessionRecorderTimer" class="srf-timer">00:00</span>
                </div>
                <div class="srf-meta">
                    <span id="sessionRecorderPatientName" class="srf-patient-name">Paciente</span>
                    <span id="sessionRecorderFormatBadge" class="srf-format-badge">SOAP</span>
                </div>
                <div class="srf-vu-container" title="Nivel de audio del micrófono">
                    <div id="sessionRecorderVuBar" class="srf-vu-bar"></div>
                </div>
                <div class="srf-actions">
                    <button id="srfPauseBtn" class="srf-btn srf-btn-pause" title="Pausar / Reanudar">
                        <i class="fas fa-pause"></i>
                    </button>
                    <button id="srfFinishBtn" class="srf-btn srf-btn-finish" title="Finalizar y generar nota con IA">
                        <i class="fas fa-sparkles"></i> <span>Generar Nota</span>
                    </button>
                    <button id="srfCancelBtn" class="srf-btn srf-btn-cancel" title="Descartar sesión">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(widget);

        // Bind events
        document.getElementById('srfPauseBtn')?.addEventListener('click', () => this.togglePause());
        document.getElementById('srfFinishBtn')?.addEventListener('click', () => this.finishAndSynthesizeNote());
        document.getElementById('srfCancelBtn')?.addEventListener('click', () => {
            if (confirm('¿Estás seguro de descartar la grabación de la sesión? Los datos se destruirán permanentemente.')) {
                this.cancel();
            }
        });
    },

    showFloatingWidget() {
        if (typeof document === 'undefined') return;
        this.ensureWidgetInDOM();
        const widget = document.getElementById('sessionRecorderFloatingBar');
        if (widget) {
            widget.style.display = 'block';
            widget.classList.add('active');
        }
    },

    hideFloatingWidget() {
        if (typeof document === 'undefined') return;
        const widget = document.getElementById('sessionRecorderFloatingBar');
        if (widget) {
            widget.style.display = 'none';
            widget.classList.remove('active');
        }
    },

    updateFloatingWidget(state) {
        if (typeof document === 'undefined') return;
        this.ensureWidgetInDOM();
        const timer = document.getElementById('sessionRecorderTimer');
        const patient = document.getElementById('sessionRecorderPatientName');
        const badge = document.getElementById('sessionRecorderFormatBadge');
        const pauseBtn = document.getElementById('srfPauseBtn');
        const dot = document.querySelector('.srf-indicator-dot');

        if (timer) timer.textContent = state.formattedTime || '00:00';
        if (patient) patient.textContent = state.patientName || 'Consulta en curso';
        if (badge) badge.textContent = state.selectedFormat || 'SOAP';

        if (pauseBtn) {
            pauseBtn.innerHTML = state.isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
            pauseBtn.title = state.isPaused ? 'Reanudar grabación' : 'Pausar grabación';
        }

        if (dot) {
            if (state.isPaused) {
                dot.classList.remove('pulse');
                dot.style.backgroundColor = '#f59e0b';
            } else {
                dot.classList.add('pulse');
                dot.style.backgroundColor = '#ef4444';
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.SessionRecorder = SessionRecorder;
} else if (typeof global !== 'undefined') {
    global.SessionRecorder = SessionRecorder;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionRecorder;
}
