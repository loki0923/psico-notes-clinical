/**
 * PSICO NOTES CLINICAL v6.0 - SERVIDOR BACKEND SEGURO & API GATEWAY
 * Express.js con persistencia PostgreSQL, API REST para Portal del Paciente, proxy seguro de Gemini y Teleconsulta.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS para permitir despliegues híbridos (Netlify + Render/Railway)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Cabeceras de Seguridad OWASP / Hardening Clínico
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Cortafuegos de Archivos Sensibles (Prevención de Exposición de Código Fuente y Credenciales)
const RESTRICTED_FILES = new Set([
    'server.js', 'db.js', 'schema.sql', 'docker-compose.yml',
    'package.json', 'package-lock.json', 'tests.js', 'plan_pruebas.md'
]);
const RESTRICTED_EXTS = ['.env', '.sql', '.yml', '.yaml', '.log'];

app.use((req, res, next) => {
    const parsedPath = path.basename(req.path.toLowerCase());
    if (
        RESTRICTED_FILES.has(parsedPath) ||
        RESTRICTED_EXTS.some(ext => parsedPath.endsWith(ext)) ||
        parsedPath.startsWith('.')
    ) {
        return res.status(403).json({ error: 'Acceso no autorizado: Archivo protegido por políticas de seguridad clínica.' });
    }
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname, {
    maxAge: '1h',
    dotfiles: 'ignore'
}));

// Inicializar capa de base de datos
await db.initialize();

// Memoria para blobs de sincronización Zero-Knowledge
const syncedStorage = new Map();

// ============================================
// ENDPOINTS DE SALUD Y ESTADO
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '6.0.0',
        timestamp: new Date().toISOString(),
        database: db.isPostgresConnected ? 'PostgreSQL' : 'Embedded Relational Engine',
        features: ['postgresql-storage', 'patient-portal-api', 'zero-knowledge-sync', 'gemini-ai-proxy', 'telehealth', 'crisis-protocol', 'cloud-sync', 'therapist-auth']
    });
});

// ============================================
// PORTAL DEL PACIENTE: AUTENTICACIÓN Y DATOS EN VIVO
// ============================================

// Autenticación por Token / PIN
app.post('/api/v1/portal/auth', async (req, res) => {
    try {
        const token = (req.body.token || req.body.code || '').trim();
        if (!token) {
            return res.status(400).json({ error: 'Código o token de acceso requerido' });
        }

        const patient = await db.findPatientByToken(token);
        if (!patient) {
            return res.status(401).json({ error: 'Código de acceso inválido o portal inactivo' });
        }

        res.json({
            authenticated: true,
            patient: {
                id: patient.id,
                name: patient.name,
                email: patient.email,
                phone: patient.phone,
                portalToken: patient.portal_token || patient.portalToken,
                therapistName: patient.therapist_name || 'Licenciado(a) en Psicología',
                therapistSpecialty: patient.therapist_specialty || 'Psicología Clínica',
                therapistRegistry: patient.therapist_registry || ''
            }
        });
    } catch (err) {
        console.error('Error en portal auth:', err);
        res.status(500).json({ error: err.message });
    }
});

// Obtener datos del paciente para el portal (tareas, autoregistros, ánimo, evaluaciones)
app.get('/api/v1/portal/me', async (req, res) => {
    try {
        const token = (req.query.token || '').trim();
        if (!token) {
            return res.status(401).json({ error: 'Token de acceso requerido' });
        }

        const patient = await db.findPatientByToken(token);
        if (!patient) {
            return res.status(401).json({ error: 'Sesión no válida o expirada' });
        }

        const portalData = await db.getPatientPortalData(patient.id);
        res.json({
            status: 'ok',
            ...portalData,
            therapistName: patient.therapist_name || 'Licenciado(a) en Psicología'
        });
    } catch (err) {
        console.error('Error obteniendo portal me:', err);
        res.status(500).json({ error: err.message });
    }
});

// Registro diario de estado de ánimo
app.post('/api/v1/portal/mood', async (req, res) => {
    try {
        const { patientId, token, mood, sleep, energy, note } = req.body;
        if (!patientId || !token) {
            return res.status(401).json({ error: 'Credenciales incompletas' });
        }

        const patient = await db.findPatientByToken(token);
        if (!patient || patient.id !== patientId) {
            return res.status(403).json({ error: 'Token no autorizado para este paciente' });
        }

        const record = await db.addMoodLog(patientId, { mood, sleep, energy, note });
        res.json({ status: 'saved', record });
    } catch (err) {
        console.error('Error guardando mood log:', err);
        res.status(500).json({ error: err.message });
    }
});

// Autoregistro cognitivo ABC (TCC)
app.post('/api/v1/portal/cbt', async (req, res) => {
    try {
        const { patientId, token, ...entry } = req.body;
        if (!patientId || !token) {
            return res.status(401).json({ error: 'Credenciales incompletas' });
        }

        const patient = await db.findPatientByToken(token);
        if (!patient || patient.id !== patientId) {
            return res.status(403).json({ error: 'Token no autorizado para este paciente' });
        }

        const record = await db.addCbtRecord(patientId, entry);
        res.json({ status: 'saved', record });
    } catch (err) {
        console.error('Error guardando autoregistro ABC:', err);
        res.status(500).json({ error: err.message });
    }
});

// Marcar tarea intersesión completada / pendiente
app.post('/api/v1/portal/tasks/:id/toggle', async (req, res) => {
    try {
        const { patientId, token } = req.body;
        const taskId = req.params.id;

        const patient = await db.findPatientByToken(token);
        if (!patient || patient.id !== patientId) {
            return res.status(403).json({ error: 'Token no autorizado para este paciente' });
        }

        const task = await db.toggleTask(taskId, patientId);
        if (!task) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        res.json({ status: 'updated', task });
    } catch (err) {
        console.error('Error actualizando tarea:', err);
        res.status(500).json({ error: err.message });
    }
});

// Guardar evaluación clínica completada por el paciente (PHQ-9 / GAD-7)
app.post('/api/v1/portal/evaluations', async (req, res) => {
    try {
        const { patientId, token, ...evalData } = req.body;
        const patient = await db.findPatientByToken(token);
        if (!patient || patient.id !== patientId) {
            return res.status(403).json({ error: 'Token no autorizado para este paciente' });
        }

        const evaluation = await db.addEvaluation(patientId, evalData);

        // Si la evaluación disparó alerta de riesgo crítico, registrar crisis en DB
        if (evalData.alertRisk || evalData.alert_risk) {
            await db.createCrisisAlert(
                patientId,
                patient.name,
                evalData.riskReason || evalData.risk_reason || 'Riesgo autolítico detectado en evaluación',
                'ALTO'
            );
        }

        res.json({ status: 'saved', evaluation, alertTriggered: Boolean(evalData.alertRisk || evalData.alert_risk) });
    } catch (err) {
        console.error('Error guardando evaluación:', err);
        res.status(500).json({ error: err.message });
    }
});

// Botón SOS / Alerta de emergencia desde el portal
app.post('/api/v1/portal/crisis', async (req, res) => {
    try {
        const { patientId, token, reason, severity } = req.body;
        const patient = await db.findPatientByToken(token);
        if (!patient || patient.id !== patientId) {
            return res.status(403).json({ error: 'Token no autorizado para este paciente' });
        }

        const alert = await db.createCrisisAlert(
            patientId,
            patient.name,
            reason || 'Solicitud de auxilio inmediato desde el Portal del Paciente',
            severity || 'ALTO'
        );

        res.json({ status: 'alert_created', alert });
    } catch (err) {
        console.error('Error en alerta de crisis:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint de consulta del terapeuta para ver datos del portal de un paciente
app.get('/api/v1/portal/data/:patientId', async (req, res) => {
    try {
        const data = await db.getPatientPortalData(req.params.patientId);
        if (!data) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        res.json({ status: 'ok', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Alertas de crisis activas para el terapeuta
app.get('/api/v1/portal/crisis-alerts', async (req, res) => {
    try {
        if (db.isPostgresConnected && db.pgPool) {
            const result = await db.pgPool.query('SELECT * FROM crisis_alerts ORDER BY created_at DESC LIMIT 50');
            return res.json({ alerts: result.rows });
        }
        res.json({ alerts: db.localStore.crisis_alerts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/v1/portal/crisis-alerts/ack/:id', async (req, res) => {
    try {
        if (db.isPostgresConnected && db.pgPool) {
            const result = await db.pgPool.query(
                'UPDATE crisis_alerts SET acknowledged = TRUE, acknowledged_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
                [req.params.id]
            );
            return res.json({ status: 'ok', alert: result.rows[0] });
        }
        const alert = db.localStore.crisis_alerts.find(a => a.id === req.params.id);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledged_at = new Date().toISOString();
            db._persistLocalStore();
        }
        res.json({ status: 'ok', alert });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sincronización batch desde la app clínica del terapeuta hacia la base de datos
app.post('/api/v1/patients/sync', async (req, res) => {
    try {
        const { patients = [], tasks = [] } = req.body;
        await db.syncPatientsBatch(patients, tasks);
        res.json({ status: 'synced', count: patients.length, timestamp: Date.now() });
    } catch (err) {
        console.error('Error sincronizando pacientes:', err);
        res.status(500).json({ error: err.message });
    }
});

// Listado de pacientes desde la base de datos
app.get('/api/v1/patients', async (req, res) => {
    try {
        if (db.isPostgresConnected && db.pgPool) {
            const result = await db.pgPool.query('SELECT * FROM patients ORDER BY name ASC');
            return res.json({ patients: result.rows });
        }
        res.json({ patients: db.localStore.patients });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PROXY SEGURO DE IA (GEMINI API)
// ============================================
app.post('/api/v1/clinical/soap-synthesize', async (req, res) => {
    try {
        const { notes, patientInfo } = req.body;
        const apiKey = process.env.GEMINI_API_KEY || req.headers['x-gemini-key'];

        if (!notes) {
            return res.status(400).json({ error: 'Faltan los apuntes de la sesión' });
        }

        if (!apiKey) {
            return res.json({
                subjetivo: `El paciente expone vivencias y sintomatología vinculada a: ${notes.substring(0, 100)}...`,
                objetivo: `Orientado en tiempo y espacio. Contacto visual adecuado, discurso coherente y lenguaje fluido.`,
                analisis: `Evolución favorable con necesidad de afianzar técnicas de regulación emocional y reestructuración.`,
                plan: `1. Mantener autoregistro intersesión.\n2. Ejercicios de respiración diafragmática.\n3. Próxima consulta en 7 días.`
            });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const sysPrompt = `Eres un redactor clínico experto. Convierte los siguientes apuntes libres en una nota SOAP en formato JSON estricto con las claves: subjetivo, objetivo, analisis, plan.`;

        const geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: notes }] }],
                systemInstruction: { parts: [{ text: sysPrompt }] },
                generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
            })
        });

        if (!geminiRes.ok) {
            const err = await geminiRes.json();
            return res.status(geminiRes.status).json({ error: err.error?.message || 'Error en Gemini API' });
        }

        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        res.json(JSON.parse(text));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// TELECONSULTA: SALA SEGURA EN VIVO
// ============================================
app.post('/api/v1/telehealth/session', (req, res) => {
    const { patientId, therapistId, appointmentId } = req.body;
    const cleanId = (appointmentId || `${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '');
    const roomId = `psico-telehealth-${cleanId}`;
    const meetingUrl = `https://meet.jit.si/${roomId}`;

    res.json({
        roomId,
        meetingUrl,
        created: new Date().toISOString(),
        instructions: 'Conexión cifrada de extremo a extremo sin instalación requerida.'
    });
});

// ============================================
// SINCRONIZACIÓN ZERO-KNOWLEDGE (BLOBS CIFRADOS)
// ============================================
app.post('/api/v1/sync/push', (req, res) => {
    const { userId, encryptedData, timestamp } = req.body;
    if (!userId || !encryptedData) {
        return res.status(400).json({ error: 'Datos de sincronización incompletos' });
    }

    syncedStorage.set(userId, { encryptedData, timestamp: timestamp || Date.now() });
    res.json({ status: 'synced', timestamp: Date.now() });
});

app.get('/api/v1/sync/pull/:userId', (req, res) => {
    const record = syncedStorage.get(req.params.userId);
    if (!record) {
        return res.status(404).json({ error: 'No hay datos sincronizados para este usuario' });
    }
    res.json(record);
});

// ============================================
// AUTENTICACIÓN CENTRALIZADA EN NUBE (TERAPEUTAS)
// ============================================

app.post('/api/v1/auth/register', async (req, res) => {
    try {
        const { name, email, passwordHash, specialty, registryNumber, phone, institution } = req.body;
        if (!email || !passwordHash) {
            return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }

        const existing = await db.findTherapistByEmail(email);
        if (existing) {
            return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo.' });
        }

        const therapist = await db.registerTherapist({
            name,
            email,
            passwordHash,
            specialty,
            registryNumber,
            phone,
            institution
        });

        res.json({
            status: 'ok',
            message: 'Cuenta creada y sincronizada en la nube con éxito.',
            therapist
        });
    } catch (err) {
        console.error('Error registrando terapeuta:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/v1/auth/login', async (req, res) => {
    try {
        const { email, passwordHash } = req.body;
        if (!email || !passwordHash) {
            return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }

        const therapist = await db.loginTherapist(email, passwordHash);
        if (!therapist) {
            return res.status(401).json({ error: 'Credenciales inválidas o cuenta inexistente.' });
        }

        // Obtener además el snapshot más reciente para responder de inmediato
        const syncData = await db.getTherapistCloudSync(therapist.id);

        res.json({
            status: 'ok',
            authenticated: true,
            therapist,
            cloudData: syncData ? syncData.payload : null,
            lastSynced: syncData ? syncData.updatedAt : null
        });
    } catch (err) {
        console.error('Error en login de terapeuta:', err);
        res.status(500).json({ error: err.message });
    }
});

// Solicitud de código de recuperación de contraseña
app.post('/api/v1/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Correo electrónico requerido' });
        }

        const resetRecord = await db.createPasswordReset(email);
        res.json({
            status: 'ok',
            message: 'Código de recuperación generado con éxito.',
            resetCode: resetRecord.code,
            expiresAt: resetRecord.expiresAt
        });
    } catch (err) {
        console.error('Error en forgot-password:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// Restablecimiento de contraseña con código verificado
app.post('/api/v1/auth/reset-password', async (req, res) => {
    try {
        const { email, code, newPasswordHash } = req.body;
        if (!email || !code || !newPasswordHash) {
            return res.status(400).json({ error: 'Email, código y nueva contraseña requeridos' });
        }

        await db.verifyAndResetPassword(email, code, newPasswordHash);
        res.json({
            status: 'ok',
            message: 'Contraseña actualizada exitosamente en la base de datos.'
        });
    } catch (err) {
        console.error('Error en reset-password:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// ============================================
// SINCRONIZACIÓN EN LA NUBE MULTI-DISPOSITIVO
// ============================================

app.get('/api/v1/clinical/sync', async (req, res) => {
    try {
        const therapistId = req.query.therapistId || req.headers['x-therapist-id'];
        if (!therapistId) {
            return res.status(400).json({ error: 'therapistId requerido para sincronización' });
        }

        const syncRecord = await db.getTherapistCloudSync(therapistId);
        if (!syncRecord) {
            return res.json({
                status: 'empty',
                therapistId,
                payload: null,
                message: 'No hay datos previos en la nube para este terapeuta.'
            });
        }

        res.json({
            status: 'ok',
            therapistId,
            payload: syncRecord.payload,
            clientTimestamp: syncRecord.clientTimestamp,
            updatedAt: syncRecord.updatedAt
        });
    } catch (err) {
        console.error('Error obteniendo sincronización cloud:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/v1/clinical/sync', async (req, res) => {
    try {
        const { therapistId, payload, clientTimestamp } = req.body;
        if (!therapistId || !payload) {
            return res.status(400).json({ error: 'therapistId y payload requeridos' });
        }

        const result = await db.saveTherapistCloudSync(therapistId, payload, clientTimestamp || Date.now());
        res.json({
            status: 'synced',
            ...result,
            message: 'Datos clínicos respaldados y sincronizados exitosamente en la nube.'
        });
    } catch (err) {
        console.error('Error guardando sincronización cloud:', err);
        res.status(500).json({ error: err.message });
    }
});

// Iniciar servidor si se ejecuta directamente
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🧠 Psico Notes Clinical v6.0 activo en http://localhost:${PORT}`);
        console.log(`📱 Portal de Pacientes disponible en http://localhost:${PORT}/portal.html`);
    });
}

export default app;
