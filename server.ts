import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
    if (!aiClient) {
        const apiKey = process.env.GEMINI_API_KEY || '';
        aiClient = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
                headers: {
                    'User-Agent': 'aistudio-build',
                },
            },
        });
    }
    return aiClient;
}

// System Instruction base for Clinical Assistant
const CLINICAL_SYSTEM_INSTRUCTION = `
Eres PsicoBot, el Asistente Clínico Inteligente especializado en Psicología Clínica y Psicoterapia para la plataforma "Psico Notes Clinical".
Tu función es actuar como co-piloto y super-supervisor clínico para profesionales de la salud mental (psicólogos clínicos, psicoterapeutas y psiquiatras).

Pautas éticas y profesionales:
1. Hablas en español clínico profesional, empático, preciso y colegiado.
2. Apoyas en formulación de casos, redacción de notas SOAP, hipótesis diagnósticas (CIE-11 / DSM-5), diseño de tareas intersesión (TCC, ACT, DBT, Sistémica, Humanista, Psicodinámica) y estrategias de intervención.
3. Recuerdas siempre que el juicio clínico final recae sobre el profesional tratante.
4. Si detectas ideación suicida o riesgo grave, resaltas la importancia de activar el Protocolo de Crisis y evaluación de seguridad inmediata.
5. Sé directo, estructurado y mantén respuestas concisas, útiles y accionables.
`;

// API Routes
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message, patientContext, consultationSummary, history } = req.body;
        if (!message) {
            res.status(400).json({ error: 'El mensaje es obligatorio' });
            return;
        }

        const ai = getGenAI();
        let promptWithContext = message;

        if (patientContext) {
            promptWithContext = `[CONTEXTO DEL PACIENTE ATADO AL CHAT]\n` +
                `Nombre: ${patientContext.name || 'Paciente'}\n` +
                `Edad: ${patientContext.age || 'No especificada'}\n` +
                `Diagnóstico actual: ${patientContext.diagnosis || 'No registrado'}\n` +
                `Motivo de consulta: ${patientContext.reason || 'Sin datos'}\n` +
                `Factores de riesgo: ${patientContext.riskFactors || 'Sin riesgo reportado'}\n` +
                `Medicación: ${patientContext.medication || 'Sin medicación'}\n` +
                `Ultimas notas: ${JSON.stringify(patientContext.recentNotes || [])}\n\n` +
                `[CONSULTA DEL TERAPEUTA]\n${message}`;
        } else if (consultationSummary) {
            promptWithContext = `[CONTEXTO GENERAL DE LA CONSULTA]\n` +
                `Total pacientes: ${consultationSummary.totalPatients || 0}\n` +
                `Pacientes en prioridad: ${consultationSummary.priorityPatients || 0}\n` +
                `Sesiones hoy: ${consultationSummary.todaySessions || 0}\n\n` +
                `[CONSULTA DEL TERAPEUTA]\n${message}`;
        }

        const contents: any[] = [];
        if (Array.isArray(history) && history.length > 0) {
            history.forEach((h: { role: string; content: string }) => {
                contents.push({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                });
            });
        }
        contents.push({
            role: 'user',
            parts: [{ text: promptWithContext }]
        });

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: contents,
            config: {
                systemInstruction: CLINICAL_SYSTEM_INSTRUCTION,
                temperature: 0.7,
            },
        });

        res.json({ text: response.text || 'No se pudo obtener respuesta del asistente.' });
    } catch (error: any) {
        console.error('Error en /api/ai/chat:', error);
        res.status(500).json({ error: error.message || 'Error interno al consultar la IA' });
    }
});

app.post('/api/ai/suggest-soap', async (req, res) => {
    try {
        const { draftText, modelApproach, patientInfo } = req.body;
        const ai = getGenAI();

        const prompt = `Un terapeuta ha redactado las siguientes notas o datos en sucio para una sesión clínica:
"${draftText || 'Sin borrador previo'}"

${modelApproach ? `Enfoque teórico preferido: ${modelApproach}` : ''}
${patientInfo ? `Datos del paciente: ${patientInfo.name}, Diag: ${patientInfo.diagnosis}` : ''}

Por favor, estructura y enriquece esta nota en el formato profesional SOAP (Subjetivo, Objetivo, Análisis, Plan) y sugiere 2 a 3 tareas intersesión concretas.
Responde ÚNICAMENTE en formato JSON válido con la siguiente estructura exactas:
{
  "subjetivo": "...",
  "objetivo": "...",
  "analisis": "...",
  "plan": "...",
  "intersessionTasks": ["tarea 1", "tarea 2"]
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                systemInstruction: CLINICAL_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subjetivo: { type: Type.STRING },
                        objetivo: { type: Type.STRING },
                        analisis: { type: Type.STRING },
                        plan: { type: Type.STRING },
                        intersessionTasks: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['subjetivo', 'objetivo', 'analisis', 'plan', 'intersessionTasks']
                }
            }
        });

        const jsonText = response.text || '{}';
        const parsed = JSON.parse(jsonText);
        res.json(parsed);
    } catch (error: any) {
        console.error('Error en /api/ai/suggest-soap:', error);
        res.status(500).json({ error: error.message || 'Error al generar la nota SOAP' });
    }
});

app.post('/api/ai/case-summary', async (req, res) => {
    try {
        const { patient, notes, scales } = req.body;
        if (!patient) {
            res.status(400).json({ error: 'Datos de paciente requeridos' });
            return;
        }

        const ai = getGenAI();
        const prompt = `Analiza el expediente clínico del siguiente paciente y genera una síntesis clínica ejecutiva:
Paciente: ${patient.name}
Nacimiento / Edad: ${patient.birthdate || 'N/D'}
Motivo de consulta: ${patient.reason || 'N/D'}
Diagnóstico registrado: ${patient.diagnosis || 'Pendiente'}
Factores de riesgo: ${patient.riskFactors || 'Ninguno'}
Factores protectores: ${patient.protectiveFactors || 'Ninguno'}
Medicación: ${patient.medication || 'Ninguna'}

Notas clínicas asociadas (${(notes || []).length}):
${(notes || []).slice(-5).map((n: any) => `- [${n.date}] ${n.title}: S: ${n.subjetivo || ''} | A: ${n.analisis || ''} | Risk: ${n.risk || 'bajo'}`).join('\n')}

Resultados de escalas / tests (${(scales || []).length}):
${(scales || []).slice(-3).map((s: any) => `- [${s.date}] ${s.scaleName || 'Escala'}: Puntuación ${s.score || 0} (${s.interpretation || ''})`).join('\n')}

Genera un resumen clínico profesional de 3 párrafos en formato Markdown:
1. Párrafo 1: Síntesis del motivo y estado clínico actual del paciente.
2. Párrafo 2: Evolución, adhesión al tratamiento y hallazgos en las sesiones.
3. Párrafo 3: Recomendaciones terapéuticas prioritarias y focos de atención para las próximas sesiones.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                systemInstruction: CLINICAL_SYSTEM_INSTRUCTION,
                temperature: 0.5,
            }
        });

        res.json({ summary: response.text || 'Sin resumen disponible.' });
    } catch (error: any) {
        console.error('Error en /api/ai/case-summary:', error);
        res.status(500).json({ error: error.message || 'Error al generar síntesis' });
    }
});

app.post('/api/ai/smart-schedule', async (req, res) => {
    try {
        const { patient, existingAppointments, selectedDate } = req.body;
        const ai = getGenAI();

        const prompt = `Recomienda 3 sugerencias de horarios para agendar una cita psicoterapéutica:
Paciente: ${patient ? patient.name : 'Paciente'} (Frecuencia deseada: ${patient ? patient.frequency || 'Semanal' : 'Semanal'})
Fecha de preferencia sugerida: ${selectedDate || new Date().toISOString().split('T')[0]}

Agenda existente cercana:
${(existingAppointments || []).map((a: any) => `- Fecha: ${a.date}, Hora: ${a.time}, Duración: ${a.duration}min, Estado: ${a.status}`).join('\n')}

Proporciona 3 opciones con fecha, hora sugerida y una justificación clínica o de agenda para cada opción.
Devuelve un JSON con la estructura:
{
  "suggestions": [
    { "date": "YYYY-MM-DD", "time": "HH:MM", "reason": "..." }
  ]
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                systemInstruction: CLINICAL_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    date: { type: Type.STRING },
                                    time: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                },
                                required: ['date', 'time', 'reason']
                            }
                        }
                    },
                    required: ['suggestions']
                }
            }
        });

        const parsed = JSON.parse(response.text || '{"suggestions":[]}');
        res.json(parsed);
    } catch (error: any) {
        console.error('Error en /api/ai/smart-schedule:', error);
        res.status(500).json({ error: error.message || 'Error al sugerir horarios' });
    }
});

// Start Express + Vite
async function startServer() {
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🧠 Psico Notes Server corriendo en http://localhost:${PORT}`);
    });
}

startServer();
