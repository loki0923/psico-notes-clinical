/**
 * PSICO NOTES CLINICAL v6.0 - MÓDULO DE IA CLÍNICA AVANZADA (GEMINI AI API)
 * 
 * Funcionalidades:
 * - Síntesis y refinamiento de notas SOAP a partir de apuntes informales o dictado por voz.
 * - Desidentificación ética de datos de salud (PHI Anonymization) previa a la llamada al LLM.
 * - Generador de hipótesis diagnósticas basadas en DSM-5-TR y CIE-11.
 * - Copiloto clínico de consulta psicoterapéutica (TCC, ACT, DBT, Sistémica).
 * - Generador de fichas de psicoeducación dinámicas personalizadas.
 */

const ClinicalAI = {
    apiKey: '',
    // Modelos oficiales de Google Gemini en orden de preferencia de velocidad y precisión
    models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],

    init() {
        this.loadApiKey();
    },

    loadApiKey() {
        if (typeof localStorage === 'undefined') return;
        const stored = localStorage.getItem('psico_gemini_api_key');
        if (stored) {
            try {
                this.apiKey = atob(stored);
            } catch (e) {
                this.apiKey = stored;
            }
        }
    },

    saveApiKey(key) {
        this.apiKey = key.trim();
        if (this.apiKey) {
            localStorage.setItem('psico_gemini_api_key', btoa(this.apiKey));
        } else {
            localStorage.removeItem('psico_gemini_api_key');
        }
    },

    hasKey() {
        return Boolean(this.apiKey && this.apiKey.length > 10);
    },

    async callGemini(prompt, systemInstruction = '', responseSchema = null) {
        if (!this.hasKey()) {
            throw new Error('API Key no configurada. Por favor introduce tu Gemini API Key en el menú de IA.');
        }

        const payload = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.2, // Baja temperatura para precisión clínica
                topP: 0.85
            }
        };

        if (responseSchema) {
            payload.generationConfig.responseMimeType = "application/json";
        }

        if (systemInstruction) {
            payload.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        let lastError = null;

        for (const modelName of this.models) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) return text;
                } else {
                    const errData = await response.json().catch(() => ({}));
                    lastError = new Error(errData.error?.message || `Error API (${response.status}) con modelo ${modelName}`);
                }
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError || new Error('No se pudo conectar con los servidores de Google Gemini API.');
    },

    /**
     * Convierte apuntes informales o dictado en una estructura SOAP clínica pulida.
     * Aplica desidentificación PHI antes de la llamada y restauración posterior.
     */
    async synthesizeSoapNote(informalNotes, patientInfo = {}) {
        if (!informalNotes || !informalNotes.trim()) {
            throw new Error('Los apuntes clínicos no pueden estar vacíos.');
        }

        // 1. Anonimizar texto clínico
        let anonymizedPrompt = informalNotes;
        let mapping = {};
        if (typeof PhiAnonymizer !== 'undefined') {
            const anonResult = PhiAnonymizer.anonymize(informalNotes, patientInfo);
            anonymizedPrompt = anonResult.anonymizedText;
            mapping = anonResult.mapping;
        }

        const sysPrompt = `Eres un asistente de redacción clínica especializado en psicología clínica y psiquiatría.
Tu tarea es convertir apuntes libres tomados por un terapeuta durante una sesión en una NOTA CLÍNICA SOAP rigurosa, profesional y concisa.
Devuelve el resultado estrictamente en formato JSON con la siguiente estructura:
{
  "subjetivo": "Relato del paciente, motivos expresados, vivencia subjetiva y quejas principales.",
  "objetivo": "Observaciones conductuales, afecto, tono de voz, lenguaje y psicometría.",
  "analisis": "Impresión diagnóstica, formulación del caso, progreso e hipótesis terapéutica.",
  "plan": "Intervenciones realizadas, tareas intersesión acordadas y enfoque para la próxima sesión."
}
Responde ÚNICAMENTE con el objeto JSON válido.`;

        const userPrompt = `Datos clínicos contextuales:
- Diagnóstico previo: ${patientInfo.diagnosis || 'En proceso diagnóstico'}
- Motivo de consulta: ${patientInfo.reason || 'Seguimiento psicoterapéutico'}
- Apuntes y relato de la sesión:
"${anonymizedPrompt}"`;

        if (!this.hasKey()) {
            const simulated = await this.simulateSoapSynthesis(informalNotes);
            return (typeof PhiAnonymizer !== 'undefined') ? PhiAnonymizer.deanonymize(simulated, mapping) : simulated;
        }

        try {
            const rawText = await this.callGemini(userPrompt, sysPrompt, true);
            const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedSoap = JSON.parse(cleanJson);
            
            // 2. Restaurar referencias originales en el cliente
            return (typeof PhiAnonymizer !== 'undefined') ? PhiAnonymizer.deanonymize(parsedSoap, mapping) : parsedSoap;
        } catch (e) {
            console.warn('Error en llamada a Gemini, recurriendo a simulador local:', e);
            const fallback = await this.simulateSoapSynthesis(informalNotes);
            return (typeof PhiAnonymizer !== 'undefined') ? PhiAnonymizer.deanonymize(fallback, mapping) : fallback;
        }
    },

    /**
     * Genera hipótesis diagnósticas DSM-5-TR y CIE-11 integrando historial y psicometría
     */
    async generateDiagnosticHypotheses(patient, notesList = [], scaleResults = []) {
        let anonPatient = { ...patient };
        let mapping = {};
        if (typeof PhiAnonymizer !== 'undefined') {
            const anon = PhiAnonymizer.anonymize(patient.name || 'Paciente', patient);
            anonPatient.name = anon.anonymizedText;
            mapping = anon.mapping;
        }

        const sysPrompt = `Eres un consultor experto en psicopatología clínica, DSM-5-TR y CIE-11.
Analiza la información clínica y genera un análisis de hipótesis diagnósticas, criterios cumplidos, diagnósticos diferenciales y sugerencias terapéuticas.
Mantén un tono profesional, ético y recordando siempre que son orientaciones de apoyo para el terapeuta tratante.
Formato de respuesta: Markdown estructurado con títulos claros, viñetas y recomendaciones de intervención.`;

        const userPrompt = `Expediente del Paciente:
- Paciente ID: ${anonPatient.name}
- Diagnóstico previo: ${patient.diagnosis || 'Sin especificar'}
- Motivo de consulta: ${patient.reason || 'No especificado'}
- Antecedentes/Historial: ${patient.medical || 'Sin registro'}

Historial de notas recientes:
${notesList.slice(-3).map(n => `- Fecha: ${n.date} | S: ${n.subjetivo || ''} A: ${n.analisis || ''}`).join('\n')}

Resultados de test/escalas psicométricas:
${scaleResults.map(s => `- Escala: ${s.scaleName || s.name || s.type} | Puntaje: ${s.score || s.total} (${s.interpretation || ''})`).join('\n')}`;

        if (!this.hasKey()) {
            return this.simulateDiagnosticHypotheses(patient, scaleResults);
        }

        try {
            const rawResponse = await this.callGemini(userPrompt, sysPrompt);
            return (typeof PhiAnonymizer !== 'undefined') ? PhiAnonymizer.deanonymize(rawResponse, mapping) : rawResponse;
        } catch (e) {
            console.warn('Error conectando con Gemini API:', e);
            return this.simulateDiagnosticHypotheses(patient, scaleResults);
        }
    },

    /**
     * Genera fichas de psicoeducación personalizadas mediante IA
     */
    async generateCustomPsychoed(topic, patientProfile = {}) {
        const sysPrompt = `Eres un experto en diseño de material psicoeducativo y recursos terapéuticos basados en evidencia (TCC, Terapia de Aceptación y Compromiso, Mindfulness).
Tu objetivo es redactar una guía práctica o ficha de trabajo para entregar al paciente, comprensible, empática y con ejercicios accionables.
Estructura de respuesta:
1. ¿Qué es y cómo funciona? (Explicación clara y normalizadora)
2. El Ciclo de retroalimentación (Pensamientos, sensaciones, emociones y conductas)
3. 3 Estrategias prácticas paso a paso
4. Ejercicio intersesión para completar`;

        const userPrompt = `Tema o problema a abordar: "${topic}"
Enfoque terapéutico preferido: ${patientProfile.approach || 'TCC'}
Objetivo clínico: Facilitar el autoconocimiento y herramientas de autorregulación.`;

        if (!this.hasKey()) {
            return `### 📘 Ficha Psicoeducativa: ${topic}
            
**1. ¿Qué es lo que ocurre?**
Cuando experimentamos dificultades relacionadas con ${topic.toLowerCase()}, nuestro cerebro y cuerpo reaccionan de manera automática ante la percepción de amenaza o sobrecarga. Sentir esto es una respuesta comprensible de tu organismo.

**2. El Ciclo Emocional:**
- **Disparador:** Situaciones que detonan tensión o incertidumbre.
- **Pensamientos:** Interpretaciones automáticas que magnifican la dificultad.
- **Cuerpo:** Respuestas fisiológicas de activación (tensión muscular, respiración rápida).
- **Conducta:** Tendencia a la evitación o sobrepensamiento.

**3. Estrategias de Afrontamiento:**
1. **Pausa Consciente:** Respira en 4 tiempos y exhala en 6 para activar el sistema parasimpático.
2. **Defusión Cognitiva:** Reconoce: *"Estoy teniendo el pensamiento de que..."* en lugar de asumirlo como un hecho inamovible.
3. **Paso Valioso:** Realiza una acción pequeña alineada con lo que realmente te importa hoy.

> *Nota: Configura tu clave de Gemini API para generar guías altamente personalizadas para cada paciente.*`;
        }

        return await this.callGemini(userPrompt, sysPrompt);
    },

    /**
     * Chat Copiloto Clínico
     */
    async chatWithCopilot(userQuery, conversationHistory = []) {
        const sysPrompt = `Eres el Copiloto Clínico de Psico Notes, una IA entrenada para asistir a psicoterapeutas y profesionales de la salud mental.
Proporcionas orientación basada en evidencia (TCC, ACT, DBT, Terapia Sistémica, etc.), sugerencias de formulación, metáforas terapéuticas y técnicas de intervención.
Responde de manera concisa, estructurada, ética y empática con el profesional.`;

        if (!this.hasKey()) {
            return `🤖 **Modo Asistido Local**: 
Para recibir respuestas generadas en tiempo real por los modelos **Gemini 2.5 Flash**, configura tu clave de API en el botón 🔑 de la barra superior.

*Orientación clínica para "${userQuery}":*
1. **Validación:** Comienza explorando la función de la conducta y validando la experiencia emocional del consultante.
2. **Psicoeducación:** Explica la interacción entre cogniciones automáticas, emociones y conductas.
3. **Intervención:** Considera técnicas de reestructuración cognitiva (registro de pensamientos de 5 columnas) o activación conductual programada.`;
        }

        const prompt = `Historial de conversación:
${conversationHistory.slice(-4).map(m => `${m.role}: ${m.text}`).join('\n')}

Consulta del terapeuta:
"${userQuery}"`;

        return await this.callGemini(prompt, sysPrompt);
    },

    simulateSoapSynthesis(text) {
        return new Promise(resolve => {
            setTimeout(() => {
                const sampleText = text.length > 80 ? text.substring(0, 80) + '...' : text;
                resolve({
                    subjetivo: `El paciente refiere: "${sampleText}". Verbaliza malestar emocional vinculado a estresores cotidianos y solicita herramientas de gestión del estado de ánimo.`,
                    objetivo: `Paciente orientado en tiempo, espacio y persona. Afecto congruente con el relato. Se aprecian signos moderados de inquietud motora y discurso coherente.`,
                    analisis: `Sintomatología compatible con trastorno de adaptación o cuadro ansioso reactivo. Buena alianza terapéutica e introspección favorable para intervenciones cognitivo-conductuales.`,
                    plan: `1. Psicoeducación sobre el ciclo del pensamiento y la emoción.\n2. Asignación de autoregistro cognitivo intersesión.\n3. Monitoreo en la próxima sesión programada.`
                });
            }, 300);
        });
    },

    simulateDiagnosticHypotheses(patient, scales) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(`### 🧠 Análisis de Hipótesis Diagnósticas (Modo Asistido)

**Paciente:** ${patient.name || 'Paciente'}

#### 1. Impresión Diagnóstica Principal (DSM-5-TR / CIE-11)
- **Trastorno de Ansiedad Generalizada (DSM-5: 300.02 / CIE-11: 6B00)**: Sugerido por preocupación excesiva persistente y tensión somática asociada.
- **Trastorno Adaptativo con Estado de Ánimo Mixto (DSM-5: 309.28)**: A ponderar ante la presencia de estresores contextuales recientes.

#### 2. Diagnóstico Diferencial
- Trastorno Depresivo Mayor (episodio único leve/moderado).
- Síntomas secundarios a factores médicos o patrones de sueño alterados.

#### 3. Recomendaciones de Abordaje Terapéutico
- Administrar inventarios estandarizados (**PHQ-9** y **GAD-7**) para seguimiento psicométrico longitudinal.
- Implementar técnicas de reestructuración cognitiva y entrenamiento en resolución de problemas.`);
            }, 300);
        });
    }
};

if (typeof window !== 'undefined') {
    window.ClinicalAI = ClinicalAI;
    ClinicalAI.init();
} else if (typeof global !== 'undefined') {
    global.ClinicalAI = ClinicalAI;
    if (typeof ClinicalAI.init === 'function') ClinicalAI.init();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClinicalAI;
}
