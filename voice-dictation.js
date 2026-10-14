/**
 * PSICO NOTES CLINICAL v6.0 - MÓDULO DE DICTADO POR VOZ CLÍNICO
 * 
 * Permite a los terapeutas dictar notas de sesión, síntesis clínicas y reflexiones
 * en tiempo real utilizando la Web Speech API con procesamiento inteligente de puntuación.
 */

const VoiceDictation = {
    recognition: null,
    isRecording: false,
    activeTargetElement: null,
    onResultCallback: null,
    onStatusChangeCallback: null,

    isSupported() {
        return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    },

    init() {
        if (!this.isSupported()) return false;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-ES';

        this.recognition.onstart = () => {
            this.isRecording = true;
            this.notifyStatus(true);
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += this.processPunctuation(transcript);
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript && this.activeTargetElement) {
                const currentVal = this.activeTargetElement.value || '';
                const spacer = currentVal.length > 0 && !currentVal.endsWith(' ') && !currentVal.endsWith('\n') ? ' ' : '';
                this.activeTargetElement.value = currentVal + spacer + finalTranscript.trim();
                // Disparar evento input para sincronización
                this.activeTargetElement.dispatchEvent(new Event('input', { bubbles: true }));
            }

            if (this.onResultCallback) {
                this.onResultCallback({ final: finalTranscript, interim: interimTranscript });
            }
        };

        this.recognition.onerror = (event) => {
            console.warn('VoiceDictation Error:', event.error);
            if (event.error === 'not-allowed') {
                if (typeof showToast === 'function') {
                    showToast('Permiso de micrófono denegado en el navegador', 'error');
                }
            }
            this.isRecording = false;
            this.notifyStatus(false);
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            this.notifyStatus(false);
        };

        return true;
    },

    start(targetElement, onResult, onStatus) {
        if (!this.isSupported()) {
            if (typeof showToast === 'function') {
                showToast('El dictado por voz no está soportado en este navegador. Usa Chrome o Edge.', 'warning');
            }
            return false;
        }

        if (!this.recognition) {
            this.init();
        }

        this.activeTargetElement = targetElement;
        this.onResultCallback = onResult || null;
        this.onStatusChangeCallback = onStatus || null;

        try {
            this.recognition.start();
            return true;
        } catch (e) {
            console.error('Error iniciando reconocimiento de voz:', e);
            return false;
        }
    },

    stop() {
        if (this.recognition && this.isRecording) {
            try {
                this.recognition.stop();
            } catch (e) {
                console.error(e);
            }
            this.isRecording = false;
            this.notifyStatus(false);
        }
    },

    toggle(targetElement, statusCallback) {
        if (this.isRecording) {
            this.stop();
            return false;
        } else {
            return this.start(targetElement, null, statusCallback);
        }
    },

    notifyStatus(recording) {
        if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback(recording);
        }
    },

    /**
     * Convierte comandos de voz clínicos comunes en signos ortográficos.
     */
    processPunctuation(text) {
        let clean = text;
        clean = clean.replace(/\b(punto y aparte|nuevo párrafo|nueva línea)\b/gi, '\n\n');
        clean = clean.replace(/\b(punto y seguido|punto seguido|punto)\b/gi, '.');
        clean = clean.replace(/\b(coma)\b/gi, ',');
        clean = clean.replace(/\b(dos puntos)\b/gi, ':');
        clean = clean.replace(/\b(punto y coma)\b/gi, ';');
        clean = clean.replace(/\b(abrir comillas)\b/gi, '"');
        clean = clean.replace(/\b(cerrar comillas)\b/gi, '"');
        clean = clean.replace(/\b(abrir interrogación)\b/gi, '¿');
        clean = clean.replace(/\b(cerrar interrogación|signo de interrogación)\b/gi, '?');

        // Capitalizar tras puntos o saltos de línea
        return clean.replace(/(?:^|[.!?\n]\s+)([a-zñáéíóú])/g, (m, letter) => m.toUpperCase());
    }
};

if (typeof window !== 'undefined') {
    window.VoiceDictation = VoiceDictation;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceDictation;
}
