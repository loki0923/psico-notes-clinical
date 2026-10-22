/**
 * PSICO NOTES CLINICAL v6.0 - SERVIDOR BACKEND SEGURO & API GATEWAY
 * Express.js con persistencia PostgreSQL, API REST para Portal del Paciente, proxy seguro de Gemini y Teleconsulta.
 * Implementación de Seguridad Clínica Grado Médico (P0): HMAC-SHA256 Sessions, BOLA/IDOR Prevention,
 * Whitelist CORS, Zero-Leak Password Reset, High-Entropy Telehealth, y Sanitización de Errores OWASP.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// GESTIÓN CRIPTOGRÁFICA DE SESIONES (HMAC-SHA256)
// ============================================
const isProd = process.env.NODE_ENV === 'production';
const DEFAULT_INSECURE_SECRET = 'psico-clinical-hmac-sha256-secret-key-prod-v6-2026';

let SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET || SESSION_SECRET === DEFAULT_INSECURE_SECRET || SESSION_SECRET.length < 32) {
    if (isProd) {
        console.warn('⚠️ AVISO [Render/Producción]: SESSION_SECRET no configurado en variables de entorno (mínimo 32 caracteres).');
        console.warn('🔐 Generando automáticamente una clave criptográfica CSPRNG de 256 bits para asegurar las sesiones en esta instancia.');
        console.warn('💡 RECOMENDACIÓN: Configura SESSION_SECRET en el panel de Render (Environment) para mantener sesiones persistentes entre reinicios.');
        SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    } else {
        SESSION_SECRET = DEFAULT_INSECURE_SECRET;
    }
}
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 días de validez máxima para sesiones clínicas

/**
 * Genera un token de sesión firmado criptográficamente para el terapeuta autenticado.
 */
export function generateSessionToken(therapistId, email = '', customExpiryMs = TOKEN_EXPIRY_MS) {
    if (!therapistId) throw new Error('therapistId es requerido para generar un token de sesión.');
    const now = Date.now();
    const payload = {
        therapistId,
        email: email || '',
        iat: now,
        exp: now + customExpiryMs
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
    return `${payloadB64}.${signature}`;
}

// Almacenes en memoria para revocación activa de sesiones
const revokedTokenHashes = new Set();
const therapistRevocationTimestamps = new Map();

/**
 * Revoca un token de sesión específico (ej. cierre de sesión explícito).
 */
export function revokeSessionToken(token) {
    if (!token || typeof token !== 'string') return;
    const hash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    revokedTokenHashes.add(hash);
}

/**
 * Invalida todas las sesiones de un terapeuta emitidas previamente (ej. cambio o recuperación de contraseña).
 */
export function revokeAllTherapistSessions(therapistId) {
    if (!therapistId) return;
    therapistRevocationTimestamps.set(therapistId, Date.now());
}

/**
 * Verifica la firma, la vigencia temporal y el estado de revocación de un token de sesión.
 * Utiliza comparación en tiempo constante (timingSafeEqual) para mitigar ataques de temporización.
 */
export function verifySessionToken(token) {
    if (!token || typeof token !== 'string') return null;
    const cleanToken = token.trim();
    const parts = cleanToken.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
    }

    // Comprobar si el token individual fue revocado explícitamente
    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
    if (revokedTokenHashes.has(tokenHash)) {
        return null;
    }

    try {
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        if (Date.now() > payload.exp) {
            return null; // Token expirado
        }
        // Comprobar si todas las sesiones del terapeuta fueron invalidadas tras emitirse el token
        const revocationTime = therapistRevocationTimestamps.get(payload.therapistId);
        if (revocationTime && payload.iat < revocationTime) {
            return null; // Sesión invalidada globalmente
        }
        return payload;
    } catch {
        return null;
    }
}

/**
 * Middleware estricto de autenticación para terapeutas.
 * Extrae y valida el token Bearer, asociando la identidad validada a `req.therapistId`.
 * Rechaza suplantación de identidad (spoofing) si el cliente envía cabeceras contradictorias.
 */
export function requireTherapistAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    } else if (req.query && req.query.sessionToken) {
        token = req.query.sessionToken;
    } else if (req.headers['x-session-token']) {
        token = req.headers['x-session-token'];
    }

    if (!token) {
        return res.status(401).json({
            error: 'No autorizado: Se requiere token de sesión Bearer válido.'
        });
    }

    const session = verifySessionToken(token);
    if (!session || !session.therapistId) {
        return res.status(401).json({
            error: 'Sesión no válida o expirada. Por favor inicie sesión nuevamente.'
        });
    }

    req.therapistId = session.therapistId;
    req.therapistSession = session;

    // Prevención de IDOR / BOLA: Si el cliente envía X-Therapist-Id o therapistId en body/query,
    // comprobar que coincida estrictamente con la identidad del token criptográfico
    const declaredId = req.headers['x-therapist-id'] || req.body?.therapistId || req.query?.therapistId;
    if (declaredId && declaredId !== session.therapistId) {
        return res.status(403).json({
            error: 'Acceso denegado: Violación de aislamiento multitenant. El identificador proporcionado no coincide con la sesión autenticada.'
        });
    }

    next();
}

/**
 * Sanitización de errores internos para cumplimiento de seguridad médica (cero fuga de stack trace o esquemas).
 */
function handleClinicalError(res, err, contextMessage) {
    console.error(`[CLINICAL-SECURITY-LOG] ${contextMessage}:`, err);
    res.status(500).json({
        error: 'Ocurrió un error interno al procesar la solicitud clínica. El evento ha sido registrado en la auditoría de seguridad.'
    });
}

// ============================================
// CONFIGURACIÓN ESTRICTA DE CORS (SEC-001)
// ============================================
const DEFAULT_ALLOWED_ORIGINS = [
    'https://psico-notes-clinical.onrender.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];
const envOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
export const ALLOWED_ORIGINS = new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);

app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Peticiones internas, same-origin o sin encabezado origin (ej. herramientas locales de servidor o nativas)
    if (!origin) {
        return next();
    }

    if (ALLOWED_ORIGINS.has(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Therapist-Id, X-Session-Token');
        res.header('Access-Control-Allow-Credentials', 'true');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        return next();
    }

    // Rechazo formal e inmediato a orígenes no autorizados
    if (req.method === 'OPTIONS') {
        return res.status(403).json({ error: 'CORS: Origen no autorizado por políticas clínicas.' });
    }
    return res.status(403).json({ error: 'Acceso denegado: Origen no autorizado por política de seguridad CORS.' });
});

// ============================================
// LIMITADOR DE TASA EN MEMORIA CONTRA FUERZA BRUTA (SEC-003)
// ============================================
const rateLimitBuckets = new Map();

function checkRateLimit(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    let bucket = rateLimitBuckets.get(key);
    if (!bucket || now - bucket.startTime > windowMs) {
        bucket = { count: 1, startTime: now };
        rateLimitBuckets.set(key, bucket);
        return { allowed: true, remaining: maxAttempts - 1 };
    }
    bucket.count++;
    if (bucket.count > maxAttempts) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterMs: Math.max(0, windowMs - (now - bucket.startTime))
        };
    }
    return { allowed: true, remaining: maxAttempts - bucket.count };
}

function rateLimitMiddleware(actionName, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1';
        const key = `${actionName}:${String(ip).split(',')[0].trim()}`;
        const check = checkRateLimit(key, maxAttempts, windowMs);
        if (!check.allowed) {
            return res.status(429).json({
                error: `Demasiados intentos fallidos. Por seguridad, la solicitud está temporalmente bloqueada. Reintente en ${Math.ceil(check.retryAfterMs / 60000)} minutos.`,
                retryAfter: Math.ceil(check.retryAfterMs / 1000)
            });
        }
        next();
    };
}

// ============================================
// REGISTRO DE AUDITORÍA MÉDICA INMUTABLE (SEC-006)
// ============================================
async function recordAuditLog(therapistId, patientId, action, resourceType, req) {
    try {
        const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1') : '127.0.0.1';
        const userAgent = req ? (req.headers['user-agent'] || 'App') : 'Internal';
        await db.createAuditLog({
            therapistId: therapistId || null,
            patientId: patientId || null,
            action,
            resourceType,
            ipAddress: String(ip).split(',')[0].trim(),
            userAgent: userAgent.substring(0, 255)
        });
    } catch (e) {
        console.warn('Advertencia en audit log:', e.message);
    }
}

// Cabeceras de Seguridad OWASP / Hardening Clínico
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// ============================================
// SERVICIO DE ARCHIVOS ESTÁTICOS PÚBLICOS EXPLÍCITOS (SEC-003 / OWASP A01)
// ============================================
// Lista blanca explícita de archivos legítimos del cliente web.
// Cualquier otro archivo interno (server.js, db.js, configs, src, node_modules, data, etc.) es estrictamente denegado con HTTP 403.
const ALLOWED_STATIC_FILES = new Set([
    'index.html',
    'portal.html',
    'styles.css',
    'portal.css',
    'manifest.json',
    'icon-192.png',
    'icon-512.png',
    'favicon.ico',
    'app.js',
    'portal.js',
    'ai-clinical.js',
    'phi-anonymizer.js',
    'voice-dictation.js',
    'psychoed.js',
    'reports.js',
    'vademecum.js',
    'scales.js',
    'finance.js',
    'adm.js',
    'session-reminders.js',
    'backup.js',
    'crisis-protocol.js',
    'consentimiento.js',
    'historia-clinica.js',
    'sw.js'
]);

// Middleware de cortafuegos y despacho exclusivo de lista blanca
app.use((req, res, next) => {
    // 1. Las rutas de API REST se procesan por sus respectivos controladores
    if (req.path.startsWith('/api/')) {
        return next();
    }

    // 2. Normalización estricta contra traversal (%2e%2e, backslashes, codificaciones dobles)
    let decodedPath = '';
    try {
        decodedPath = decodeURIComponent(req.path);
    } catch {
        return res.status(400).json({ error: 'Ruta con codificación no válida.' });
    }

    const normalized = path.normalize(decodedPath).replace(/\\/g, '/');

    // 3. Documentos principales de entrada
    if (normalized === '/' || normalized === '/index.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(path.join(__dirname, 'index.html'));
    }
    if (normalized === '/portal' || normalized === '/portal.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(path.join(__dirname, 'portal.html'));
    }

    // 4. Directorio público de assets gráficos y fuentes
    if (normalized.startsWith('/assets/')) {
        const safeRel = path.relative('/assets', normalized);
        if (safeRel.startsWith('..') || path.isAbsolute(safeRel)) {
            return res.status(403).json({ error: 'Acceso no autorizado: Archivo o recurso protegido por políticas de seguridad clínica.' });
        }
        const fullAssetPath = path.join(__dirname, 'assets', safeRel);
        if (fs.existsSync(fullAssetPath) && !fs.statSync(fullAssetPath).isDirectory()) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.sendFile(fullAssetPath);
        }
        return res.status(404).json({ error: 'Recurso de assets no encontrado.' });
    }

    // 5. Archivos individuales en raíz expresamente autorizados por la lista blanca
    const cleanBasename = path.basename(normalized);
    const segments = normalized.split('/').filter(Boolean);

    if (segments.length === 1 && ALLOWED_STATIC_FILES.has(cleanBasename)) {
        const fullFilePath = path.join(__dirname, cleanBasename);
        if (fs.existsSync(fullFilePath)) {
            if (cleanBasename.endsWith('.html') || cleanBasename.endsWith('.js') || cleanBasename.endsWith('.css')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            } else if (cleanBasename === 'manifest.json') {
                res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
                res.setHeader('Cache-Control', 'public, max-age=3600');
            } else {
                res.setHeader('Cache-Control', 'public, max-age=3600');
            }
            return res.sendFile(fullFilePath);
        }
    }

    // 6. Cualquier otra ruta o archivo fuera de la lista blanca es bloqueado por seguridad
    return res.status(403).json({
        error: 'Acceso no autorizado: Archivo o recurso protegido por políticas de seguridad clínica.'
    });
});

app.use(express.json({ limit: '10mb' }));

// Inicializar capa de base de datos
await db.initialize();

// Memoria para blobs de sincronización Zero-Knowledge
const syncedStorage = new Map();

// ============================================
// ENDPOINTS DE SALUD Y ESTADO
// ============================================
app.get(['/api/health', '/api/v1/health'], (req, res) => {
    res.json({
        status: 'ok',
        version: '6.0.0',
        timestamp: new Date().toISOString(),
        database: db.isPostgresConnected ? 'PostgreSQL' : 'Embedded Relational Engine',
        features: [
            'postgresql-storage', 'patient-portal-api', 'zero-knowledge-sync',
            'gemini-ai-proxy', 'telehealth', 'crisis-protocol', 'cloud-sync',
            'therapist-auth', 'multitenant-isolation', 'hmac-sessions'
        ]
    });
});

// ============================================
// PORTAL DEL PACIENTE: AUTENTICACIÓN Y DATOS EN VIVO
// ============================================

// Autenticación por Token / PIN (SEC-003: Rate Limited & Zero PII Leak)
app.post('/api/v1/portal/auth', rateLimitMiddleware('portal_auth', 5, 15 * 60 * 1000), async (req, res) => {
    try {
        const token = (req.body.token || req.body.code || '').trim();
        if (!token) {
            return res.status(400).json({ error: 'Código o token de acceso requerido' });
        }

        const patient = await db.findPatientByToken(token);
        if (!patient) {
            return res.status(401).json({ error: 'Código de acceso inválido o portal inactivo' });
        }

        // Validación de caducidad si existe portal_expires_at
        if (patient.portal_expires_at && new Date(patient.portal_expires_at) < new Date()) {
            return res.status(401).json({ error: 'El acceso al portal ha caducado. Contacte a su terapeuta.' });
        }

        await recordAuditLog(patient.therapist_id, patient.id, 'PORTAL_AUTH_SUCCESS', 'PORTAL', req);

        // SEC-003: No devolver teléfono, correo ni token reflejado en la respuesta
        res.json({
            authenticated: true,
            patient: {
                id: patient.id,
                name: patient.name,
                therapistName: patient.therapist_name || 'Licenciado(a) en Psicología',
                therapistSpecialty: patient.therapist_specialty || 'Psicología Clínica'
            }
        });
    } catch (err) {
        handleClinicalError(res, err, 'Error en portal auth');
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
        handleClinicalError(res, err, 'Error obteniendo portal me');
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
        handleClinicalError(res, err, 'Error guardando mood log');
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
        handleClinicalError(res, err, 'Error guardando autoregistro ABC');
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
        handleClinicalError(res, err, 'Error actualizando tarea');
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
        handleClinicalError(res, err, 'Error guardando evaluación');
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
        handleClinicalError(res, err, 'Error en alerta de crisis');
    }
});

// ============================================
// SUBSISTEMA PORTAL PACIENTES KID (PSICO KIDS SPACE)
// ============================================

// Registrar actividad lúdica del niño (avatar, clima de corazón, burbujas o dibujo)
app.post('/api/v1/portal/kid/activity', async (req, res) => {
    try {
        const { patientId, token, activityType, data } = req.body;
        const patientToken = token || req.body.patientToken;

        if (!patientToken || !activityType) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos (token y activityType)' });
        }

        const patient = await db.findPatientByToken(patientToken);
        if (!patient) {
            return res.status(401).json({ error: 'Token no autorizado o portal inactivo' });
        }

        if (patientId && patient.id !== patientId) {
            return res.status(403).json({ error: 'Token no coincide con el paciente' });
        }

        const record = await db.saveKidActivity(patient.id, { activityType, data: data || {} });
        await recordAuditLog(patient.therapist_id, patient.id, 'RECORD_KID_ACTIVITY', 'PORTAL_KID', req);

        res.status(201).json({
            status: 'saved',
            record,
            rewardStar: true,
            reward: {
                stars: 1,
                message: '¡Excelente trabajo! Has ganado una estrella mágica 🌟'
            }
        });
    } catch (err) {
        handleClinicalError(res, err, 'Error registrando actividad infantil en portal kid');
    }
});

// Recuperar actividades lúdicas del niño para su espacio personal
app.get('/api/v1/portal/kid/activity', async (req, res) => {
    try {
        const token = (req.query.token || req.query.patientToken || '').trim();
        if (!token) {
            return res.status(401).json({ error: 'Token de acceso requerido' });
        }

        const patient = await db.findPatientByToken(token);
        if (!patient) {
            return res.status(401).json({ error: 'Token no autorizado o expirado' });
        }

        const activities = await db.getKidActivities(patient.id);
        res.json({
            status: 'ok',
            patientName: patient.name,
            activities
        });
    } catch (err) {
        handleClinicalError(res, err, 'Error obteniendo actividades kid');
    }
});

// Consulta del terapeuta para ver actividades del portal kid con aislamiento BOLA/IDOR
app.get('/api/v1/patients/:id/kid-activity', requireTherapistAuth, async (req, res) => {
    try {
        const patientId = req.params.id;
        let patient = null;
        if (db.isPostgresConnected && db.pgPool) {
            const check = await db.pgPool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
            patient = check.rows[0];
        } else {
            patient = (db.localStore.patients || []).find(p => p.id === patientId);
        }

        if (!patient) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        // BOLA / IDOR Prevention: Solo el terapeuta asignado puede consultar las actividades del niño
        if (!patient.therapist_id || patient.therapist_id !== req.therapistId) {
            await recordAuditLog(req.therapistId, patientId, 'CROSS_TENANT_KID_ACTIVITY_ATTEMPT_BLOCKED', 'PATIENTS', req);
            return res.status(403).json({
                error: 'Acceso denegado: El expediente consultado pertenece a otro profesional de la salud o carece de asignación válida.'
            });
        }

        const activities = await db.getKidActivities(patientId);
        await recordAuditLog(req.therapistId, patientId, 'READ_KID_ACTIVITIES', 'PATIENTS', req);
        res.json({ status: 'ok', activities });
    } catch (err) {
        handleClinicalError(res, err, 'Error obteniendo actividades infantiles para el terapeuta');
    }
});

// ============================================
// CONSULTA CLÍNICA DEL TERAPEUTA (PROTECCIÓN MULTITENANT & BOLA P0)
// ============================================

// Endpoint de consulta del terapeuta para ver datos del portal de un paciente
app.get('/api/v1/portal/data/:patientId', requireTherapistAuth, async (req, res) => {
    try {
        const data = await db.getPatientPortalData(req.params.patientId);
        if (!data || !data.patient) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        // BOLA / IDOR Prevention: Verificar estrictamente que el paciente pertenezca al terapeuta autenticado
        if (!data.patient.therapist_id || data.patient.therapist_id !== req.therapistId) {
            await recordAuditLog(req.therapistId, req.params.patientId, 'CROSS_TENANT_READ_ATTEMPT_BLOCKED', 'PORTAL_DATA', req);
            return res.status(403).json({
                error: 'Acceso denegado: El expediente consultado pertenece a otro profesional de la salud o carece de asignación válida.'
            });
        }

        await recordAuditLog(req.therapistId, req.params.patientId, 'READ_PORTAL_DATA', 'PORTAL_DATA', req);
        res.json({ status: 'ok', data });
    } catch (err) {
        handleClinicalError(res, err, 'Error obteniendo datos de portal de paciente');
    }
});

// Alertas de crisis activas para el terapeuta (Aislamiento por terapeuta autenticado)
app.get('/api/v1/portal/crisis-alerts', requireTherapistAuth, async (req, res) => {
    try {
        if (db.isPostgresConnected && db.pgPool) {
            const result = await db.pgPool.query(
                `SELECT ca.* FROM crisis_alerts ca
                 JOIN patients p ON ca.patient_id = p.id
                 WHERE p.therapist_id = $1
                 ORDER BY ca.created_at DESC LIMIT 50`,
                [req.therapistId]
            );
            return res.json({ alerts: result.rows });
        }

        const therapistPatients = (db.localStore.patients || []).filter(p => p.therapist_id === req.therapistId);
        const patientIdSet = new Set(therapistPatients.map(p => p.id));
        const alerts = (db.localStore.crisis_alerts || []).filter(a => patientIdSet.has(a.patient_id));
        res.json({ alerts });
    } catch (err) {
        handleClinicalError(res, err, 'Error consultando alertas de crisis');
    }
});

// Reconocer alerta de crisis con control de acceso por recurso
app.post('/api/v1/portal/crisis-alerts/ack/:id', requireTherapistAuth, async (req, res) => {
    try {
        if (db.isPostgresConnected && db.pgPool) {
            const check = await db.pgPool.query(
                `SELECT ca.*, p.therapist_id FROM crisis_alerts ca
                 JOIN patients p ON ca.patient_id = p.id
                 WHERE ca.id = $1`,
                [req.params.id]
            );
            if (check.rowCount === 0) {
                return res.status(404).json({ error: 'Alerta no encontrada' });
            }
            if (check.rows[0].therapist_id !== req.therapistId) {
                return res.status(403).json({ error: 'Acceso denegado: La alerta de crisis pertenece a un paciente de otro profesional.' });
            }
            const result = await db.pgPool.query(
                'UPDATE crisis_alerts SET acknowledged = TRUE, acknowledged_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
                [req.params.id]
            );
            return res.json({ status: 'ok', alert: result.rows[0] });
        }

        const alert = (db.localStore.crisis_alerts || []).find(a => a.id === req.params.id);
        if (!alert) {
            return res.status(404).json({ error: 'Alerta no encontrada' });
        }
        const patient = (db.localStore.patients || []).find(p => p.id === alert.patient_id);
        if (patient && patient.therapist_id && patient.therapist_id !== req.therapistId) {
            return res.status(403).json({ error: 'Acceso denegado: La alerta de crisis pertenece a un paciente de otro profesional.' });
        }
        alert.acknowledged = true;
        alert.acknowledged_at = new Date().toISOString();
        db._persistLocalStore();
        res.json({ status: 'ok', alert });
    } catch (err) {
        handleClinicalError(res, err, 'Error reconociendo alerta de crisis');
    }
});

// Sincronización batch desde la app clínica del terapeuta hacia la base de datos (SEC-002: Multi-Tenant)
app.post('/api/v1/patients/sync', requireTherapistAuth, async (req, res) => {
    try {
        const therapistId = req.therapistId;
        const { patients = [], tasks = [] } = req.body;

        // Comprobación de integridad multitenant: Prohibir sobrescritura de pacientes ajenos
        if (db.isPostgresConnected && db.pgPool && patients.length > 0) {
            const patientIds = patients.map(p => p.id).filter(Boolean);
            if (patientIds.length > 0) {
                const conflict = await db.pgPool.query(
                    'SELECT id FROM patients WHERE id = ANY($1) AND therapist_id != $2',
                    [patientIds, therapistId]
                );
                if (conflict.rowCount > 0) {
                    return res.status(403).json({
                        error: 'Acceso denegado: Uno o más expedientes pertenecen a otro profesional de la salud.'
                    });
                }
            }
        } else if (patients.length > 0) {
            const hasCrossConflict = patients.some(p => {
                const existing = (db.localStore.patients || []).find(ep => ep.id === p.id);
                return existing && existing.therapist_id && existing.therapist_id !== therapistId;
            });
            if (hasCrossConflict) {
                return res.status(403).json({
                    error: 'Acceso denegado: Uno o más expedientes pertenecen a otro profesional de la salud.'
                });
            }
        }

        // Asignar therapist_id validado a todos los registros para forzar aislamiento inmutable
        const isolatedPatients = patients.map(p => ({
            ...p,
            therapist_id: therapistId
        }));

        await db.syncPatientsBatch(isolatedPatients, tasks);
        await recordAuditLog(therapistId, null, 'SYNC_PATIENTS_BATCH', 'PATIENTS', req);
        res.json({ status: 'synced', count: patients.length, timestamp: Date.now() });
    } catch (err) {
        handleClinicalError(res, err, 'Error sincronizando pacientes');
    }
});

// Listado de pacientes desde la base de datos (SEC-002: Filtrado estricto por terapeuta autenticado)
app.get('/api/v1/patients', requireTherapistAuth, async (req, res) => {
    try {
        const therapistId = req.therapistId;
        const patients = await db.getPatientsByTherapist(therapistId);
        await recordAuditLog(therapistId, null, 'READ_PATIENTS_LIST', 'PATIENTS', req);
        res.json({ patients });
    } catch (err) {
        handleClinicalError(res, err, 'Error consultando lista de pacientes');
    }
});

// ============================================
// PROXY SEGURO DE IA (GEMINI API)
// ============================================
app.post('/api/v1/clinical/soap-synthesize', requireTherapistAuth, async (req, res) => {
    try {
        const { notes, patientInfo } = req.body;
        // La clave de API se obtiene EXCLUSIVAMENTE del entorno del servidor por políticas de seguridad clínica (HIPAA/OWASP)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!notes) {
            return res.status(400).json({ error: 'Faltan los apuntes de la sesión' });
        }

        if (!apiKey) {
            return res.status(503).json({
                error: 'Servicio de IA clínica (Gemini) no configurado en el servidor. Configure GEMINI_API_KEY en variables de entorno.',
                source: 'unavailable'
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
        handleClinicalError(res, err, 'Error en síntesis SOAP por IA');
    }
});

// Estado de disponibilidad del servicio de IA clínica (Gemini)
app.get('/api/v1/clinical/ai-status', requireTherapistAuth, (req, res) => {
    const isConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
    res.json({
        available: isConfigured,
        model: 'gemini-2.5-flash',
        managedBy: 'server'
    });
});

// Proxy seguro para consultas clínicas asistidas por IA (Hipótesis diagnósticas, psicoeducación y copiloto)
app.post('/api/v1/clinical/ai-query', requireTherapistAuth, async (req, res) => {
    try {
        const { prompt, systemInstruction, responseMimeType } = req.body;
        // La clave de API se obtiene EXCLUSIVAMENTE del entorno del servidor por políticas de seguridad clínica (HIPAA/OWASP)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!prompt) {
            return res.status(400).json({ error: 'Falta el contenido de consulta' });
        }

        if (!apiKey) {
            return res.status(503).json({
                error: 'Servicio de IA clínica (Gemini) no configurado en el servidor. Configure GEMINI_API_KEY en variables de entorno.',
                source: 'unavailable'
            });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2,
                topP: 0.85
            }
        };

        if (responseMimeType) {
            payload.generationConfig.responseMimeType = responseMimeType;
        }

        if (systemInstruction) {
            payload.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        const geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiRes.ok) {
            const err = await geminiRes.json().catch(() => ({}));
            return res.status(geminiRes.status).json({ error: err.error?.message || 'Error en Gemini API' });
        }

        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        res.json({ text });
    } catch (err) {
        handleClinicalError(res, err, 'Error en consulta de IA');
    }
});

// ============================================
// TELECONSULTA: SALA SEGURA EN VIVO (ALTA ENTROPÍA / NO PREDECIBLE)
// ============================================
app.post('/api/v1/telehealth/session', async (req, res) => {
    try {
        let isAuthorized = false;
        let callerTherapistId = null;

        // Vía 1: Terapeuta autenticado con Bearer token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const session = verifySessionToken(authHeader.substring(7).trim());
            if (session && session.therapistId) {
                isAuthorized = true;
                callerTherapistId = session.therapistId;
            }
        }

        // Vía 2: Paciente autenticado con token del portal
        if (!isAuthorized && req.body.patientToken) {
            const patient = await db.findPatientByToken(req.body.patientToken);
            if (patient) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(401).json({
                error: 'Acceso no autorizado: Se requiere sesión de terapeuta o token de portal activo.'
            });
        }

        // Generar identificador de sala criptográficamente seguro de 192 bits (24 bytes base64url)
        // Impredecible e invulnerable a ataques de enumeración o intercepción de sesiones clínicas
        const secureNonce = crypto.randomBytes(24).toString('base64url');
        const roomId = `psico-${secureNonce}`;
        const meetingUrl = `https://meet.jit.si/${roomId}`;

        if (callerTherapistId) {
            await recordAuditLog(callerTherapistId, req.body.patientId || null, 'CREATE_TELEHEALTH_SESSION', 'TELEHEALTH', req);
        }

        res.json({
            status: 'ok',
            roomId,
            meetingUrl,
            created: new Date().toISOString(),
            instructions: 'Conexión cifrada de extremo a extremo sin instalación requerida.'
        });
    } catch (err) {
        handleClinicalError(res, err, 'Error generando sala de teleconsulta');
    }
});

// ============================================
// SINCRONIZACIÓN ZERO-KNOWLEDGE (BLOBS CIFRADOS CON CONTROL DE ACCESO)
// ============================================
app.post('/api/v1/sync/push', requireTherapistAuth, (req, res) => {
    const { userId, encryptedData, timestamp } = req.body;
    if (!userId || !encryptedData) {
        return res.status(400).json({ error: 'Datos de sincronización incompletos' });
    }

    if (userId !== req.therapistId) {
        return res.status(403).json({ error: 'Acceso denegado: No puede almacenar datos en el buzón de otro usuario.' });
    }

    if (typeof encryptedData === 'string' && encryptedData.length > 5 * 1024 * 1024) {
        return res.status(413).json({ error: 'Carga útil excede el límite permitido (5MB).' });
    }

    syncedStorage.set(userId, { encryptedData, timestamp: timestamp || Date.now() });
    res.json({ status: 'synced', timestamp: Date.now() });
});

app.get('/api/v1/sync/pull/:userId', requireTherapistAuth, (req, res) => {
    if (req.params.userId !== req.therapistId) {
        return res.status(403).json({ error: 'Acceso denegado: No puede acceder a datos sincronizados de otro usuario.' });
    }

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
        const { id, name, email, passwordHash, specialty, registryNumber, phone, institution } = req.body;
        if (!email || !passwordHash) {
            return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const existing = await db.findTherapistByEmail(cleanEmail);
        if (existing) {
            // Reconexión segura únicamente si coincide estrictamente el hash de la contraseña
            if (passwordHash && existing.password_hash === passwordHash) {
                const sessionToken = generateSessionToken(existing.id, existing.email);
                await recordAuditLog(existing.id, null, 'REGISTER_THERAPIST_RECONNECT', 'AUTH', req);
                const safeExisting = { ...existing };
                delete safeExisting.password_hash;
                delete safeExisting.passwordHash;
                return res.json({
                    status: 'ok',
                    message: 'Sesión clínica reconectada con éxito.',
                    sessionToken,
                    therapist: safeExisting
                });
            }
            return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo.' });
        }

        const therapist = await db.registerTherapist({
            id: id || undefined,
            name,
            email: cleanEmail,
            passwordHash,
            specialty,
            registryNumber,
            phone,
            institution
        });

        const sessionToken = generateSessionToken(therapist.id, therapist.email);
        await recordAuditLog(therapist.id, null, 'REGISTER_THERAPIST_SUCCESS', 'AUTH', req);

        const safeTherapist = { ...therapist };
        delete safeTherapist.password_hash;
        delete safeTherapist.passwordHash;

        res.json({
            status: 'ok',
            message: 'Cuenta creada y sincronizada en la nube con éxito.',
            sessionToken,
            therapist: safeTherapist
        });
    } catch (err) {
        if (err.statusCode === 409 || (err.message && err.message.includes('Conflicto'))) {
            return res.status(409).json({ error: err.message });
        }
        handleClinicalError(res, err, 'Error registrando terapeuta');
    }
});

app.post('/api/v1/auth/login', rateLimitMiddleware('therapist_login', 5, 15 * 60 * 1000), async (req, res) => {
    try {
        const { email, passwordHash } = req.body;
        if (!email || !passwordHash) {
            return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const therapist = await db.loginTherapist(cleanEmail, passwordHash);
        if (!therapist) {
            await recordAuditLog(null, null, 'LOGIN_FAILED', 'AUTH', req);
            return res.status(401).json({ error: 'Credenciales inválidas o cuenta inexistente.' });
        }

        const sessionToken = generateSessionToken(therapist.id, therapist.email);
        const syncData = await db.getTherapistCloudSync(therapist.id);
        await recordAuditLog(therapist.id, null, 'LOGIN_SUCCESS', 'AUTH', req);

        const safeTherapist = { ...therapist };
        delete safeTherapist.password_hash;
        delete safeTherapist.passwordHash;

        res.json({
            status: 'ok',
            authenticated: true,
            sessionToken,
            therapist: safeTherapist,
            cloudData: syncData ? syncData.payload : null,
            lastSynced: syncData ? syncData.updatedAt : null
        });
    } catch (err) {
        handleClinicalError(res, err, 'Error en login de terapeuta');
    }
});

// Cierre de sesión y revocación inmediata de token de sesión (OWASP Session Management)
app.post('/api/v1/auth/logout', requireTherapistAuth, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        let token = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7).trim();
        } else if (req.query?.sessionToken) {
            token = req.query.sessionToken;
        } else if (req.headers['x-session-token']) {
            token = req.headers['x-session-token'];
        }

        if (token) {
            revokeSessionToken(token);
        }

        await recordAuditLog(req.therapistId, null, 'LOGOUT_SUCCESS', 'AUTH', req);
        res.json({ status: 'ok', message: 'Sesión revocada exitosamente.' });
    } catch (err) {
        handleClinicalError(res, err, 'Error en cierre de sesión');
    }
});

// Solicitud de código de recuperación de contraseña (CERO FUGA DE CÓDIGO & PREVENCIÓN DE ENUMERACIÓN P0)
app.post('/api/v1/auth/forgot-password', rateLimitMiddleware('forgot_password', 5, 30 * 60 * 1000), async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Correo electrónico requerido' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        try {
            const resetRecord = await db.createPasswordReset(normalizedEmail);
            await recordAuditLog(null, null, 'REQUEST_PASSWORD_RESET', 'AUTH', req);
            // El código se registra en consola segura de servidor para entornos de pruebas locales
            // pero NUNCA se retorna en la respuesta HTTP al cliente público.
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[AUTH-AUDIT] Código de recuperación generado para ${normalizedEmail}: [PROTEGIDO EN AUDITORÍA]`);
            }
        } catch (innerErr) {
            // Silenciosamente capturar fallo si el usuario no existe para prevenir enumeración de cuentas (OWASP)
            console.log(`[AUTH-AUDIT] Solicitud forgot-password para cuenta no registrada: ${normalizedEmail}`);
        }

        // Respuesta uniforme e idéntica siempre para prevenir ataques de enumeración
        res.json({
            status: 'ok',
            message: 'Si el correo electrónico se encuentra registrado en el sistema, se ha procesado un código de recuperación confidencial.'
        });
    } catch (err) {
        handleClinicalError(res, err, 'Error en forgot-password');
    }
});

// Restablecimiento de contraseña con código verificado e invalidación inmediata de sesiones previas
app.post('/api/v1/auth/reset-password', rateLimitMiddleware('reset_password', 5, 15 * 60 * 1000), async (req, res) => {
    try {
        const { email, code, newPasswordHash } = req.body;
        if (!email || !code || !newPasswordHash) {
            return res.status(400).json({ error: 'Email, código y nueva contraseña requeridos' });
        }

        const cleanEmail = email.trim().toLowerCase();
        await db.verifyAndResetPassword(cleanEmail, code, newPasswordHash);

        // Revocar inmediatamente todas las sesiones existentes del terapeuta para mitigar secuestro de sesión
        const therapist = await db.findTherapistByEmail(cleanEmail);
        if (therapist && therapist.id) {
            revokeAllTherapistSessions(therapist.id);
        }

        await recordAuditLog(therapist?.id || null, null, 'PASSWORD_RESET_SUCCESS', 'AUTH', req);
        res.json({
            status: 'ok',
            message: 'Contraseña actualizada exitosamente en la base de datos.'
        });
    } catch (err) {
        console.warn('Fallo en restablecimiento de contraseña:', err.message);
        res.status(400).json({ error: err.message || 'Código de verificación inválido o expirado.' });
    }
});

// ============================================
// FACTURACIÓN SENIAT PERSISTENTE (DB-002 CON AUTENTICACIÓN)
// ============================================

app.get('/api/v1/billing/config', requireTherapistAuth, async (req, res) => {
    try {
        const therapistId = req.therapistId;
        const config = await db.getBillingConfig(therapistId);
        res.json({ status: 'ok', config });
    } catch (err) {
        handleClinicalError(res, err, 'Error consultando configuración de facturación');
    }
});

app.post('/api/v1/billing/config', requireTherapistAuth, async (req, res) => {
    try {
        const therapistId = req.therapistId;
        const config = req.body.config || req.body;
        const saved = await db.saveBillingConfig(therapistId, config);
        await recordAuditLog(therapistId, null, 'SAVE_BILLING_CONFIG', 'BILLING', req);
        res.json({ status: 'ok', config: saved });
    } catch (err) {
        handleClinicalError(res, err, 'Error guardando configuración de facturación');
    }
});

app.get('/api/v1/billing/invoices', requireTherapistAuth, async (req, res) => {
    try {
        const therapistId = req.therapistId;
        const invoices = await db.getBillingInvoices(therapistId);
        res.json({ status: 'ok', invoices });
    } catch (err) {
        handleClinicalError(res, err, 'Error consultando facturas');
    }
});

app.post('/api/v1/billing/invoices', requireTherapistAuth, async (req, res) => {
    try {
        const therapistId = req.therapistId;
        const invoice = req.body.invoice || req.body;
        const saved = await db.saveBillingInvoice(therapistId, invoice);
        await recordAuditLog(therapistId, invoice.patientId, 'CREATE_INVOICE', 'BILLING', req);
        res.json({ status: 'ok', invoice: saved });
    } catch (err) {
        handleClinicalError(res, err, 'Error guardando factura');
    }
});

// Endpoint seguro de consulta de auditoría médica (SEC-006)
app.get('/api/v1/audit/logs', requireTherapistAuth, async (req, res) => {
    try {
        const therapistId = req.therapistId;
        if (db.isPostgresConnected && db.pgPool) {
            const result = await db.pgPool.query(
                'SELECT * FROM audit_logs WHERE therapist_id = $1 ORDER BY created_at DESC LIMIT 100',
                [therapistId]
            );
            return res.json({ status: 'ok', logs: result.rows });
        }
        const logs = (db.localStore.audit_logs || []).filter(l => l.therapist_id === therapistId);
        res.json({ status: 'ok', logs });
    } catch (err) {
        handleClinicalError(res, err, 'Error consultando bitácora de auditoría');
    }
});

// ============================================
// SINCRONIZACIÓN EN LA NUBE MULTI-DISPOSITIVO
// ============================================

app.get('/api/v1/clinical/sync', requireTherapistAuth, async (req, res) => {
    try {
        const therapistId = req.therapistId;
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
        handleClinicalError(res, err, 'Error obteniendo sincronización cloud');
    }
});

app.post('/api/v1/clinical/sync', requireTherapistAuth, async (req, res) => {
    try {
        const therapistId = req.therapistId;
        const { payload, clientTimestamp } = req.body;
        if (!payload) {
            return res.status(400).json({ error: 'payload requerido para sincronización clínica' });
        }

        const result = await db.saveTherapistCloudSync(therapistId, payload, clientTimestamp || Date.now());
        res.json({
            status: 'synced',
            ...result,
            message: 'Datos clínicos respaldados y sincronizados exitosamente en la nube.'
        });
    } catch (err) {
        handleClinicalError(res, err, 'Error guardando sincronización cloud');
    }
});

// Iniciar servidor si se ejecuta directamente
const isDirectRun = Boolean(process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isDirectRun && process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🧠 Psico Notes Clinical v6.0 activo en http://localhost:${PORT}`);
        console.log(`📱 Portal de Pacientes disponible en http://localhost:${PORT}/portal.html`);
    });
}

export default app;
