/**
 * PSICO NOTES CLINICAL v6.0 - PERSISTENCE & DATABASE LAYER
 * Driver dual PostgreSQL con pool 'pg' y resguardo de persistencia transaccional.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'psiconotes_relacional.json');
const LOCAL_DB_BACKUP_PATH = path.join(DATA_DIR, 'psiconotes_relacional.json.bak');
const LOCAL_DB_TMP_PATH = path.join(DATA_DIR, 'psiconotes_relacional.json.tmp');

// Asegurar directorio local de datos
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

class DatabaseManager {
    constructor() {
        this.isPostgresConnected = false;
        this.pgPool = null;
        this._isCorruptState = false;
        this.localStore = this._loadLocalStore();
        if (!this.localStore.kid_portal_activities) {
            this.localStore.kid_portal_activities = [];
        }
    }

    _loadLocalStore() {
        try {
            if (fs.existsSync(LOCAL_DB_PATH)) {
                const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error('⚠️ Error al leer almacén local primario:', e.message);
            // Intentar recuperar desde el respaldo atómico si existe
            try {
                if (fs.existsSync(LOCAL_DB_BACKUP_PATH)) {
                    console.warn('🔄 Restaurando almacén local desde archivo de respaldo (.bak)...');
                    const backupRaw = fs.readFileSync(LOCAL_DB_BACKUP_PATH, 'utf8');
                    const parsedBackup = JSON.parse(backupRaw);
                    fs.writeFileSync(LOCAL_DB_PATH, backupRaw, 'utf8');
                    return parsedBackup;
                }
            } catch (backupErr) {
                console.error('❌ Respaldo .bak también corrupto o inaccesible:', backupErr.message);
            }

            // Si el archivo existía pero falló el parseo tanto del primario como del .bak,
            // marcar el estado de corrupción para proteger contra sobreescritura destructiva vacía.
            if (fs.existsSync(LOCAL_DB_PATH)) {
                this._isCorruptState = true;
                const corruptDump = path.join(DATA_DIR, `psiconotes_corrupt_${Date.now()}.json`);
                try {
                    fs.copyFileSync(LOCAL_DB_PATH, corruptDump);
                    console.error(`🚨 Archivo corrupto preservado en: ${corruptDump}`);
                } catch {}
            }
        }
        return {
            therapists: [],
            patients: [],
            patient_tasks: [],
            cbt_records: [],
            mood_logs: [],
            evaluations: [],
            crisis_alerts: [],
            clinical_notes: [],
            appointments: [],
            therapist_cloud_sync: {},
            password_resets: {},
            audit_logs: [],
            billing_configs: {},
            billing_invoices: [],
            kid_portal_activities: []
        };
    }

    _persistLocalStore() {
        if (this._isCorruptState) {
            throw new Error('PERSISTENCIA BLOQUEADA: El almacén de datos local se encuentra en estado corrupto sin respaldo válido. Operación cancelada para prevenir pérdida o sobreescritura destructiva de expedientes.');
        }

        const tmpFile = `${LOCAL_DB_TMP_PATH}.${process.pid}.${Date.now()}`;
        try {
            const dataStr = JSON.stringify(this.localStore, null, 2);
            // 1. Escritura atómica primero en archivo temporal único por proceso
            fs.writeFileSync(tmpFile, dataStr, 'utf8');

            // 2. Crear copia de respaldo del archivo actual previo a la sustitución
            if (fs.existsSync(LOCAL_DB_PATH)) {
                try {
                    fs.copyFileSync(LOCAL_DB_PATH, LOCAL_DB_BACKUP_PATH);
                } catch (backupErr) {
                    console.warn('⚠️ No se pudo renovar copia de respaldo .bak:', backupErr.message);
                }
            }

            // 3. Renombrado atómico (garantiza integridad ante caídas de proceso)
            fs.renameSync(tmpFile, LOCAL_DB_PATH);
        } catch (e) {
            console.error('❌ Error persistiendo almacén de datos atómicamente:', e.message);
            if (fs.existsSync(tmpFile)) {
                try { fs.unlinkSync(tmpFile); } catch {}
            }
            // Propagar el fallo para que la API responda con error real en vez de falso éxito
            throw new Error(`Fallo crítico de persistencia en disco: ${e.message}`);
        }
    }

    async initialize() {
        const dbUrl = process.env.DATABASE_URL;
        const isProd = process.env.NODE_ENV === 'production';

        // En producción, exigir PostgreSQL expresamente a menos que se autorice explícitamente modo local
        if (isProd && !dbUrl && !process.env.ALLOW_LOCAL_DB_IN_PROD) {
            throw new Error('FALLO CRÍTICO DE ARQUITECTURA: En producción (NODE_ENV=production) se requiere base de datos PostgreSQL mediante DATABASE_URL. El sistema no degradará silenciosamente a archivos locales efímeros.');
        }

        if (dbUrl) {
            try {
                // Auto-remediación preventiva de pg-types para entornos Linux / Render
                try {
                    const { createRequire } = await import('module');
                    const req = createRequire(import.meta.url);
                    const { ensurePgTypes } = req('./scripts/ensure-pg-types.cjs');
                    if (ensurePgTypes) ensurePgTypes();
                } catch {}

                let pg;
                try {
                    const { createRequire } = await import('module');
                    const cjsRequire = createRequire(import.meta.url);
                    pg = cjsRequire('pg');
                } catch {
                    const pgModule = await import('pg');
                    pg = pgModule.default || pgModule;
                }
                const poolConfig = {
                    connectionString: dbUrl,
                    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
                    max: 10,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 10000
                };
                this.pgPool = new pg.Pool(poolConfig);

                // Probar conexión y asegurar liberación del cliente en bloque finally
                const client = await this.pgPool.connect();
                try {
                    console.log('🐘 PostgreSQL conectado exitosamente');
                    
                    // Aplicar schema DDL
                    const schemaPath = path.join(__dirname, 'schema.sql');
                    if (fs.existsSync(schemaPath)) {
                        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                        await client.query(schemaSql);
                        console.log('✅ Esquema DDL de PostgreSQL verificado y actualizado');
                    }
                    this.isPostgresConnected = true;
                    return;
                } finally {
                    client.release();
                }
            } catch (err) {
                if (isProd && !process.env.ALLOW_LOCAL_DB_IN_PROD) {
                    throw new Error(`FALLO CRÍTICO DE CONEXIÓN POSTGRESQL EN PRODUCCIÓN: ${err.message}. El sistema no degradará silenciosamente a almacenamiento local.`);
                }
                console.warn(`⚠️ No se pudo conectar a PostgreSQL (${err.message}). Utilizando motor de persistencia local adaptativo.`);
                this.isPostgresConnected = false;
            }
        } else {
            console.log('ℹ️ DATABASE_URL no configurada. Operando en modo motor relacional embebido.');
        }
    }

    // ============================================
    // MÉTODOS PARA EL PORTAL DEL PACIENTE
    // ============================================

    async findPatientByToken(token) {
        if (!token) return null;
        const cleanToken = token.trim().toUpperCase();

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `SELECT p.*, t.name as therapist_name, t.specialty as therapist_specialty, t.registry_number as therapist_registry
                 FROM patients p
                 LEFT JOIN therapists t ON p.therapist_id = t.id
                 WHERE UPPER(p.portal_token) = $1 AND p.portal_enabled = TRUE`,
                [cleanToken]
            );
            return res.rows[0] || null;
        }

        const patient = this.localStore.patients.find(
            p => (p.portal_token || p.portalToken || '').toUpperCase() === cleanToken && (p.portal_enabled !== false && p.portalEnabled !== false)
        );
        if (!patient) return null;

        const therapist = this.localStore.therapists.find(t => t.id === patient.therapist_id) || {};
        return {
            ...patient,
            therapist_name: therapist.name || 'Licenciado(a) en Psicología',
            therapist_specialty: therapist.specialty || 'Psicología Clínica',
            therapist_registry: therapist.registry_number || ''
        };
    }

    async getPatientPortalData(patientId) {
        if (!patientId) return null;

        if (this.isPostgresConnected && this.pgPool) {
            const [pRes, tasksRes, cbtRes, moodsRes, evalsRes, alertsRes] = await Promise.all([
                this.pgPool.query('SELECT * FROM patients WHERE id = $1', [patientId]),
                this.pgPool.query('SELECT * FROM patient_tasks WHERE patient_id = $1 ORDER BY created_at DESC', [patientId]),
                this.pgPool.query('SELECT * FROM cbt_records WHERE patient_id = $1 ORDER BY created_at DESC', [patientId]),
                this.pgPool.query('SELECT * FROM mood_logs WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 30', [patientId]),
                this.pgPool.query('SELECT * FROM evaluations WHERE patient_id = $1 ORDER BY created_at DESC', [patientId]),
                this.pgPool.query('SELECT * FROM crisis_alerts WHERE patient_id = $1 AND acknowledged = FALSE ORDER BY created_at DESC LIMIT 1', [patientId])
            ]);

            const patient = pRes.rows[0];
            if (!patient) return null;

            return {
                patient,
                tasks: tasksRes.rows,
                cbtRecords: cbtRes.rows,
                moodLogs: moodsRes.rows,
                evaluations: evalsRes.rows,
                hasActiveCrisisAlert: alertsRes.rows.length > 0,
                kidActivities: await this.getKidActivities(patientId)
            };
        }

        const patient = this.localStore.patients.find(p => p.id === patientId);
        if (!patient) return null;

        return {
            patient,
            tasks: this.localStore.patient_tasks.filter(t => t.patient_id === patientId),
            cbtRecords: this.localStore.cbt_records.filter(c => c.patient_id === patientId),
            moodLogs: this.localStore.mood_logs.filter(m => m.patient_id === patientId),
            evaluations: this.localStore.evaluations.filter(e => e.patient_id === patientId),
            hasActiveCrisisAlert: this.localStore.crisis_alerts.some(a => a.patient_id === patientId && !a.acknowledged),
            kidActivities: (this.localStore.kid_portal_activities || []).filter(k => k.patient_id === patientId)
        };
    }

    async addMoodLog(patientId, { mood, sleep, energy, note }) {
        const record = {
            id: `mood_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            patient_id: patientId,
            mood_score: Number(mood) || 3,
            sleep_score: Number(sleep) || 3,
            energy_score: Number(energy) || 3,
            note: note || '',
            created_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `INSERT INTO mood_logs (id, patient_id, mood_score, sleep_score, energy_score, note, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [record.id, record.patient_id, record.mood_score, record.sleep_score, record.energy_score, record.note, record.created_at]
            );
            return res.rows[0];
        }

        this.localStore.mood_logs.unshift(record);
        this._persistLocalStore();
        return record;
    }

    async addCbtRecord(patientId, entry) {
        const record = {
            id: `cbt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            patient_id: patientId,
            situation: entry.situation || '',
            thought: entry.thought || '',
            distortion: entry.distortion || '',
            emotion: entry.emotion || '',
            initial_intensity: Number(entry.initialIntensity ?? entry.initial_intensity) || 50,
            rational_thought: entry.rationalThought || entry.rational_thought || '',
            final_intensity: Number(entry.finalIntensity ?? entry.final_intensity) || 30,
            behavioral_reaction: entry.behavioralReaction || entry.behavioral_reaction || '',
            created_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `INSERT INTO cbt_records (id, patient_id, situation, thought, distortion, emotion, initial_intensity, rational_thought, final_intensity, behavioral_reaction, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [record.id, record.patient_id, record.situation, record.thought, record.distortion, record.emotion, record.initial_intensity, record.rational_thought, record.final_intensity, record.behavioral_reaction, record.created_at]
            );
            return res.rows[0];
        }

        this.localStore.cbt_records.unshift(record);
        this._persistLocalStore();
        return record;
    }

    async toggleTask(taskId, patientId) {
        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `UPDATE patient_tasks 
                 SET completed = NOT completed,
                     completed_at = CASE WHEN NOT completed THEN CURRENT_TIMESTAMP ELSE NULL END
                 WHERE id = $1 AND patient_id = $2
                 RETURNING *`,
                [taskId, patientId]
            );
            return res.rows[0] || null;
        }

        const task = this.localStore.patient_tasks.find(t => t.id === taskId && t.patient_id === patientId);
        if (task) {
            task.completed = !task.completed;
            task.completed_at = task.completed ? new Date().toISOString() : null;
            this._persistLocalStore();
        }
        return task;
    }

    async addEvaluation(patientId, evalData) {
        const record = {
            id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            patient_id: patientId,
            scale_type: evalData.scaleType || evalData.scale_type || 'phq9',
            score: Number(evalData.score) || 0,
            max_score: Number(evalData.maxScore || evalData.max_score) || 27,
            severity: evalData.severity || 'Normal',
            action_plan: evalData.actionPlan || evalData.action_plan || '',
            answers: evalData.answers || [],
            alert_risk: Boolean(evalData.alertRisk || evalData.alert_risk),
            risk_reason: evalData.riskReason || evalData.risk_reason || '',
            source: 'portal',
            created_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `INSERT INTO evaluations (id, patient_id, scale_type, score, max_score, severity, action_plan, answers, alert_risk, risk_reason, source, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
                [record.id, record.patient_id, record.scale_type, record.score, record.max_score, record.severity, record.action_plan, JSON.stringify(record.answers), record.alert_risk, record.risk_reason, record.source, record.created_at]
            );
            return res.rows[0];
        }

        this.localStore.evaluations.unshift(record);
        this._persistLocalStore();
        return record;
    }

    async createCrisisAlert(patientId, patientName, reason = 'Activación de Protocolo SOS en Portal', severity = 'ALTO') {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            patient_id: patientId,
            patient_name: patientName,
            severity,
            reason,
            acknowledged: false,
            acknowledged_at: null,
            created_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `INSERT INTO crisis_alerts (id, patient_id, patient_name, severity, reason, acknowledged, created_at)
                 VALUES ($1, $2, $3, $4, $5, FALSE, $6) RETURNING *`,
                [alert.id, alert.patient_id, alert.patient_name, alert.severity, alert.reason, alert.created_at]
            );
            return res.rows[0];
        }

        this.localStore.crisis_alerts.unshift(alert);
        this._persistLocalStore();
        return alert;
    }

    async saveKidActivity(patientId, { activityType, data }) {
        if (!patientId || !activityType) throw new Error('patientId y activityType son requeridos');
        const record = {
            id: `kid_act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            patient_id: patientId,
            activity_type: activityType,
            data: data || {},
            created_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `INSERT INTO kid_portal_activities (id, patient_id, activity_type, data, created_at)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [record.id, record.patient_id, record.activity_type, JSON.stringify(record.data), record.created_at]
            );
            return {
                ...res.rows[0],
                data: typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data
            };
        }

        if (!this.localStore.kid_portal_activities) {
            this.localStore.kid_portal_activities = [];
        }
        this.localStore.kid_portal_activities.unshift(record);
        this._persistLocalStore();
        return record;
    }

    async getKidActivities(patientId) {
        if (!patientId) return [];

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `SELECT * FROM kid_portal_activities 
                 WHERE patient_id = $1 
                 ORDER BY created_at DESC LIMIT 50`,
                [patientId]
            );
            return res.rows.map(r => ({
                ...r,
                data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data
            }));
        }

        if (!this.localStore.kid_portal_activities) {
            this.localStore.kid_portal_activities = [];
        }
        return (this.localStore.kid_portal_activities || [])
            .filter(a => a.patient_id === patientId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // ============================================
    // SINCRONIZACIÓN GENERAL DEL EXPEDIENTE CLÍNICO
    // ============================================

    async upsertPatient(patientData) {
        const id = patientData.id || `patient_${Date.now()}`;
        const patient = {
            id,
            therapist_id: patientData.therapist_id || patientData.therapistId || null,
            name: patientData.name || '',
            email: patientData.email || '',
            phone: patientData.phone || '',
            birthdate: patientData.birthdate || null,
            life_stage: patientData.life_stage || patientData.lifeStage || patientData.category || 'adult',
            occupation: patientData.occupation || '',
            civil_status: patientData.civil_status || patientData.civilStatus || '',
            guardian_name: patientData.guardian_name || patientData.guardianName || '',
            guardian_phone: patientData.guardian_phone || patientData.guardianPhone || '',
            diagnosis: patientData.diagnosis || '',
            portal_token: patientData.portal_token || patientData.portalToken || null,
            portal_enabled: patientData.portal_enabled ?? patientData.portalEnabled ?? true,
            portal_created_at: patientData.portal_created_at || patientData.portalCreatedAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const query = `
                INSERT INTO patients (id, therapist_id, name, email, phone, birthdate, life_stage, occupation, civil_status, guardian_name, guardian_phone, diagnosis, portal_token, portal_enabled, portal_created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    email = EXCLUDED.email,
                    phone = EXCLUDED.phone,
                    birthdate = EXCLUDED.birthdate,
                    life_stage = EXCLUDED.life_stage,
                    occupation = EXCLUDED.occupation,
                    civil_status = EXCLUDED.civil_status,
                    guardian_name = EXCLUDED.guardian_name,
                    guardian_phone = EXCLUDED.guardian_phone,
                    diagnosis = EXCLUDED.diagnosis,
                    portal_token = EXCLUDED.portal_token,
                    portal_enabled = EXCLUDED.portal_enabled,
                    updated_at = EXCLUDED.updated_at
                RETURNING *
            `;
            const values = [
                patient.id, patient.therapist_id, patient.name, patient.email, patient.phone,
                patient.birthdate, patient.life_stage, patient.occupation, patient.civil_status,
                patient.guardian_name, patient.guardian_phone, patient.diagnosis,
                patient.portal_token, patient.portal_enabled, patient.portal_created_at, patient.updated_at
            ];
            const res = await this.pgPool.query(query, values);
            return res.rows[0];
        }

        const idx = this.localStore.patients.findIndex(p => p.id === id || (patient.portal_token && p.portal_token === patient.portal_token));
        if (idx >= 0) {
            this.localStore.patients[idx] = { ...this.localStore.patients[idx], ...patient };
        } else {
            this.localStore.patients.push(patient);
        }
        this._persistLocalStore();
        return patient;
    }

    async syncPatients(patientsArray, therapistId = null) {
        if (!Array.isArray(patientsArray)) return [];
        const synced = [];
        for (const p of patientsArray) {
            const data = { ...p };
            if (therapistId) data.therapist_id = therapistId;
            const res = await this.upsertPatient(data);
            synced.push(res);
        }
        return synced;
    }

    async syncPatientsBatch(patientsArray, tasksArray = [], therapistId = null) {
        for (const p of patientsArray) {
            const data = { ...p };
            if (therapistId && !data.therapist_id) {
                data.therapist_id = therapistId;
            }
            await this.upsertPatient(data);
        }
        for (const t of tasksArray) {
            if (t.id && t.patient_id && t.title) {
                if (this.isPostgresConnected && this.pgPool) {
                    await this.pgPool.query(`
                        INSERT INTO patient_tasks (id, patient_id, title, description, deadline, completed, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (id) DO UPDATE SET
                            title = EXCLUDED.title,
                            description = EXCLUDED.description,
                            deadline = EXCLUDED.deadline,
                            completed = EXCLUDED.completed
                    `, [t.id, t.patient_id, t.title, t.description || '', t.deadline || null, Boolean(t.completed), t.created_at || new Date().toISOString()]);
                } else {
                    const idx = this.localStore.patient_tasks.findIndex(existing => existing.id === t.id);
                    if (idx >= 0) this.localStore.patient_tasks[idx] = { ...this.localStore.patient_tasks[idx], ...t };
                    else this.localStore.patient_tasks.push(t);
                }
            }
        }
        if (!this.isPostgresConnected) this._persistLocalStore();
    }

    // ============================================
    // GESTIÓN DE TERAPEUTAS & AUTENTICACIÓN CLOUD
    // ============================================

    async findTherapistByEmail(email) {
        if (!email) return null;
        const cleanEmail = email.trim().toLowerCase();

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                'SELECT * FROM therapists WHERE LOWER(email) = $1',
                [cleanEmail]
            );
            return res.rows[0] || null;
        }

        return this.localStore.therapists.find(t => (t.email || '').toLowerCase() === cleanEmail) || null;
    }

    async findTherapistById(id) {
        if (!id) return null;

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                'SELECT * FROM therapists WHERE id = $1',
                [id]
            );
            return res.rows[0] || null;
        }

        return this.localStore.therapists.find(t => t.id === id) || null;
    }

    async registerTherapist(data) {
        const id = data.id || `therapist_${Date.now()}`;
        const cleanEmail = (data.email || '').trim().toLowerCase();

        // Prevención de usurpación/BOLA: Si se envía un ID explícito, verificar que no pertenezca a otra cuenta
        const existingById = await this.findTherapistById(id);
        if (existingById && (existingById.email || '').toLowerCase() !== cleanEmail) {
            const err = new Error('Conflicto de identidad: El identificador solicitado ya pertenece a otro profesional registrado.');
            err.statusCode = 409;
            throw err;
        }

        const therapist = {
            id,
            name: data.name || '',
            email: cleanEmail,
            specialty: data.specialty || 'Psicología Clínica',
            registry_number: data.registryNumber || data.registry_number || '',
            phone: data.phone || '',
            institution: data.institution || '',
            password_hash: data.passwordHash || data.password_hash || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const query = `
                INSERT INTO therapists (id, name, specialty, registry_number, email, phone, institution, password_hash, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (email) DO UPDATE SET
                    name = EXCLUDED.name,
                    specialty = EXCLUDED.specialty,
                    registry_number = EXCLUDED.registry_number,
                    phone = EXCLUDED.phone,
                    institution = EXCLUDED.institution,
                    password_hash = CASE WHEN EXCLUDED.password_hash != '' THEN EXCLUDED.password_hash ELSE therapists.password_hash END,
                    updated_at = EXCLUDED.updated_at
                RETURNING *
            `;
            const values = [
                therapist.id, therapist.name, therapist.specialty, therapist.registry_number,
                therapist.email, therapist.phone, therapist.institution, therapist.password_hash,
                therapist.created_at, therapist.updated_at
            ];
            const res = await this.pgPool.query(query, values);
            const saved = res.rows[0];
            delete saved.password_hash;
            delete saved.passwordHash;
            return saved;
        }

        const idx = this.localStore.therapists.findIndex(t => (t.email || '').toLowerCase() === therapist.email);
        if (idx >= 0) {
            this.localStore.therapists[idx] = {
                ...this.localStore.therapists[idx],
                ...therapist,
                password_hash: therapist.password_hash || this.localStore.therapists[idx].password_hash
            };
        } else {
            this.localStore.therapists.push(therapist);
        }
        this._persistLocalStore();

        const copy = { ...therapist };
        delete copy.password_hash;
        delete copy.passwordHash;
        return copy;
    }

    async loginTherapist(email, passwordHash) {
        if (!email || !passwordHash) return null;
        const therapist = await this.findTherapistByEmail(email);
        if (!therapist) return null;

        if (therapist.password_hash && therapist.password_hash !== passwordHash) {
            return null;
        }

        const clean = { ...therapist };
        delete clean.password_hash;
        delete clean.passwordHash;
        return clean;
    }

    // ============================================
    // SINCRONIZACIÓN EN LA NUBE MULTI-DISPOSITIVO
    // ============================================

    async saveTherapistCloudSync(therapistId, payload, clientTimestamp = Date.now()) {
        if (!therapistId || !payload) return null;

        // Si el payload incluye pacientes y tareas, sincronizarlos también a nivel relacional
        if (Array.isArray(payload.patients) && payload.patients.length > 0) {
            try {
                const tasks = (payload.notes || [])
                    .flatMap(n => n.intersessionTasks || [])
                    .concat(payload.tasks || []);
                await this.syncPatientsBatch(payload.patients, tasks, therapistId);
            } catch (err) {
                console.warn('Advertencia en sync relacional batch:', err.message);
            }
        }

        if (this.isPostgresConnected && this.pgPool) {
            const query = `
                INSERT INTO therapist_cloud_sync (therapist_id, payload, client_timestamp, updated_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (therapist_id) DO UPDATE SET
                    payload = EXCLUDED.payload,
                    client_timestamp = EXCLUDED.client_timestamp,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const res = await this.pgPool.query(query, [therapistId, JSON.stringify(payload), clientTimestamp]);
            return {
                therapistId,
                clientTimestamp,
                updatedAt: res.rows[0].updated_at
            };
        }

        if (!this.localStore.therapist_cloud_sync) {
            this.localStore.therapist_cloud_sync = {};
        }

        this.localStore.therapist_cloud_sync[therapistId] = {
            payload,
            clientTimestamp,
            updatedAt: new Date().toISOString()
        };
        this._persistLocalStore();

        return {
            therapistId,
            clientTimestamp,
            updatedAt: this.localStore.therapist_cloud_sync[therapistId].updatedAt
        };
    }

    async getTherapistCloudSync(therapistId) {
        if (!therapistId) return null;

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                'SELECT payload, client_timestamp, updated_at FROM therapist_cloud_sync WHERE therapist_id = $1',
                [therapistId]
            );
            if (res.rows.length === 0) return null;
            const row = res.rows[0];
            return {
                payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
                clientTimestamp: row.client_timestamp,
                updatedAt: row.updated_at
            };
        }

        if (!this.localStore.therapist_cloud_sync) return null;
        return this.localStore.therapist_cloud_sync[therapistId] || null;
    }

    // ============================================
    // RECUPERACIÓN Y RESTABLECIMIENTO DE CONTRASEÑA
    // ============================================

    async createPasswordReset(email) {
        if (!email) throw new Error('El correo electrónico es requerido.');
        const cleanEmail = email.trim().toLowerCase();

        const therapist = await this.findTherapistByEmail(cleanEmail);
        if (!therapist) {
            throw new Error('No existe ninguna cuenta profesional registrada con este correo.');
        }

        // Generar PIN de 6 dígitos con vigencia de 15 minutos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        if (this.isPostgresConnected && this.pgPool) {
            await this.pgPool.query(`
                INSERT INTO password_resets (email, code, expires_at, created_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (email) DO UPDATE SET
                    code = EXCLUDED.code,
                    expires_at = EXCLUDED.expires_at,
                    created_at = CURRENT_TIMESTAMP
            `, [cleanEmail, code, expiresAt]);
        } else {
            if (!this.localStore.password_resets) this.localStore.password_resets = {};
            this.localStore.password_resets[cleanEmail] = { code, expiresAt };
            this._persistLocalStore();
        }

        return { email: cleanEmail, code, expiresAt };
    }

    async verifyAndResetPassword(email, code, newPasswordHash) {
        if (!email || !code || !newPasswordHash) {
            throw new Error('Todos los campos son obligatorios para restablecer la contraseña.');
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanCode = code.trim();

        let record = null;
        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query('SELECT * FROM password_resets WHERE email = $1', [cleanEmail]);
            record = res.rows[0];
        } else {
            record = (this.localStore.password_resets || {})[cleanEmail];
        }

        if (!record) {
            throw new Error('No hay ninguna solicitud de recuperación activa para este correo. Solicita un nuevo código.');
        }

        if (record.code !== cleanCode) {
            throw new Error('El código de verificación ingresado es incorrecto.');
        }

        const expires = new Date(record.expires_at || record.expiresAt).getTime();
        if (Date.now() > expires) {
            throw new Error('El código de verificación ha expirado. Por favor solicita uno nuevo.');
        }

        // Actualizar contraseña en base de datos
        if (this.isPostgresConnected && this.pgPool) {
            await this.pgPool.query('UPDATE therapists SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE LOWER(email) = $2', [newPasswordHash, cleanEmail]);
            await this.pgPool.query('DELETE FROM password_resets WHERE email = $1', [cleanEmail]);
        } else {
            const idx = this.localStore.therapists.findIndex(t => (t.email || '').toLowerCase() === cleanEmail);
            if (idx >= 0) {
                this.localStore.therapists[idx].password_hash = newPasswordHash;
                this.localStore.therapists[idx].updated_at = new Date().toISOString();
            }
            delete this.localStore.password_resets[cleanEmail];
            this._persistLocalStore();
        }

        return true;
    }

    // ============================================
    // AISLAMIENTO MULTI-TENANT & AUDITORÍA (SEC-002 / SEC-006)
    // ============================================

    async getPatientsByTherapist(therapistId) {
        if (!therapistId) return [];
        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query('SELECT * FROM patients WHERE therapist_id = $1 ORDER BY name ASC', [therapistId]);
            return res.rows;
        }
        return this.localStore.patients.filter(p => Boolean(p.therapist_id) && p.therapist_id === therapistId);
    }

    async getPatientById(patientId) {
        if (!patientId) return null;
        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
            return res.rows[0] || null;
        }
        return this.localStore.patients.find(p => p.id === patientId) || null;
    }

    async createAuditLog({ therapistId, patientId, action, resourceType, ipAddress, userAgent, details }) {
        const logEntry = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            therapist_id: therapistId || null,
            patient_id: patientId || null,
            action: action || 'UNKNOWN_ACTION',
            resource_type: resourceType || 'SYSTEM',
            ip_address: ipAddress || '127.0.0.1',
            user_agent: (userAgent || '').substring(0, 255),
            details: details || {},
            created_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            try {
                await this.pgPool.query(`
                    INSERT INTO audit_logs (therapist_id, patient_id, action, resource_type, ip_address, user_agent, details, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                `, [logEntry.therapist_id, logEntry.patient_id, logEntry.action, logEntry.resource_type, logEntry.ip_address, logEntry.user_agent, JSON.stringify(logEntry.details)]);
            } catch (err) {
                console.warn('Fallo en escritura a audit_logs PostgreSQL:', err.message);
            }
        } else {
            if (!this.localStore.audit_logs) this.localStore.audit_logs = [];
            this.localStore.audit_logs.push(logEntry);
            if (this.localStore.audit_logs.length > 500) this.localStore.audit_logs.shift();
            this._persistLocalStore();
        }
        return logEntry;
    }

    // ============================================
    // FACTURACIÓN SENIAT EN BASE DE DATOS (DB-002)
    // ============================================

    async saveBillingConfig(therapistId, config) {
        if (!therapistId) return null;
        const record = {
            therapist_id: therapistId,
            fiscal_name: config.fiscalName || config.fiscal_name || '',
            rif: config.rif || 'V-',
            address: config.address || '',
            phone: config.phone || '',
            invoice_prefix: config.invoicePrefix || config.invoice_prefix || 'FACT-',
            next_number: config.nextNumber || config.next_number || 1,
            iva_rate: config.ivaRate || config.iva_rate || 0,
            apply_igtf: config.applyIGTF ?? config.apply_igtf ?? true,
            updated_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const query = `
                INSERT INTO billing_config (therapist_id, fiscal_name, rif, address, phone, invoice_prefix, next_number, iva_rate, apply_igtf, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
                ON CONFLICT (therapist_id) DO UPDATE SET
                    fiscal_name = EXCLUDED.fiscal_name,
                    rif = EXCLUDED.rif,
                    address = EXCLUDED.address,
                    phone = EXCLUDED.phone,
                    invoice_prefix = EXCLUDED.invoice_prefix,
                    next_number = EXCLUDED.next_number,
                    iva_rate = EXCLUDED.iva_rate,
                    apply_igtf = EXCLUDED.apply_igtf,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const res = await this.pgPool.query(query, [
                record.therapist_id, record.fiscal_name, record.rif, record.address, record.phone,
                record.invoice_prefix, record.next_number, record.iva_rate, record.apply_igtf
            ]);
            return res.rows[0];
        }

        if (!this.localStore.billing_configs) this.localStore.billing_configs = {};
        this.localStore.billing_configs[therapistId] = record;
        this._persistLocalStore();
        return record;
    }

    async getBillingConfig(therapistId) {
        if (!therapistId) return null;
        let row = null;
        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query('SELECT * FROM billing_config WHERE therapist_id = $1', [therapistId]);
            row = res.rows[0] || null;
        } else {
            row = (this.localStore.billing_configs && this.localStore.billing_configs[therapistId]) || null;
        }
        if (!row) return null;
        return {
            ...row,
            fiscalName: row.fiscal_name || row.fiscalName || '',
            fiscal_name: row.fiscal_name || row.fiscalName || '',
            invoicePrefix: row.invoice_prefix || row.invoicePrefix || 'FACT-',
            invoice_prefix: row.invoice_prefix || row.invoicePrefix || 'FACT-',
            nextNumber: row.next_number || row.nextNumber || 1,
            next_number: row.next_number || row.nextNumber || 1,
            ivaRate: row.iva_rate ?? row.ivaRate ?? 0,
            iva_rate: row.iva_rate ?? row.ivaRate ?? 0,
            applyIGTF: row.apply_igtf ?? row.applyIGTF ?? true,
            apply_igtf: row.apply_igtf ?? row.applyIGTF ?? true
        };
    }

    async saveBillingInvoice(therapistId, invoice) {
        if (!therapistId || !invoice) return null;
        const record = {
            id: invoice.id || `inv_${Date.now()}`,
            therapist_id: therapistId,
            patient_id: invoice.patientId || invoice.patient_id || null,
            invoice_number: invoice.number || invoice.invoice_number || 'FACT-0001',
            issue_date: invoice.date || invoice.issue_date || new Date().toISOString().split('T')[0],
            patient_name: invoice.patientName || invoice.patient_name || invoice.clientName || 'Paciente',
            patient_rif: invoice.patientRif || invoice.patient_rif || invoice.clientRif || '',
            subtotal: Math.round(((Number(invoice.amountUSD ?? invoice.subtotal ?? 0)) + Number.EPSILON) * 100) / 100,
            iva_amount: Math.round(((Number(invoice.ivaAmount ?? invoice.iva_amount ?? 0)) + Number.EPSILON) * 100) / 100,
            igtf_amount: Math.round(((Number(invoice.igtfUSD ?? invoice.igtfAmount ?? invoice.igtf_amount ?? 0)) + Number.EPSILON) * 100) / 100,
            total_amount: Math.round(((Number(invoice.totalUSD ?? invoice.total ?? invoice.total_amount ?? 0)) + Number.EPSILON) * 100) / 100,
            totalUSD: Math.round(((Number(invoice.totalUSD ?? invoice.total ?? invoice.total_amount ?? 0)) + Number.EPSILON) * 100) / 100,
            amountUSD: Math.round(((Number(invoice.amountUSD ?? invoice.subtotal ?? 0)) + Number.EPSILON) * 100) / 100,
            igtfUSD: Math.round(((Number(invoice.igtfUSD ?? invoice.igtfAmount ?? invoice.igtf_amount ?? 0)) + Number.EPSILON) * 100) / 100,
            currency: invoice.currency || 'USD',
            status: invoice.status || 'emitida',
            created_at: invoice.created_at || new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const query = `
                INSERT INTO billing_invoices (id, therapist_id, patient_id, invoice_number, issue_date, patient_name, patient_rif, subtotal, iva_amount, igtf_amount, total_amount, currency, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (id) DO UPDATE SET
                    status = EXCLUDED.status,
                    total_amount = EXCLUDED.total_amount
                RETURNING *
            `;
            const res = await this.pgPool.query(query, [
                record.id, record.therapist_id, record.patient_id, record.invoice_number, record.issue_date,
                record.patient_name, record.patient_rif, record.subtotal, record.iva_amount, record.igtf_amount,
                record.total_amount, record.currency, record.status, record.created_at
            ]);
            return res.rows[0];
        }

        if (!this.localStore.billing_invoices) this.localStore.billing_invoices = [];
        const idx = this.localStore.billing_invoices.findIndex(i => i.id === record.id);
        if (idx >= 0) this.localStore.billing_invoices[idx] = record;
        else this.localStore.billing_invoices.push(record);
        this._persistLocalStore();
        return record;
    }

    async getBillingInvoices(therapistId) {
        if (!therapistId) return [];
        let rows = [];
        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query('SELECT * FROM billing_invoices WHERE therapist_id = $1 ORDER BY issue_date DESC', [therapistId]);
            rows = res.rows;
        } else {
            rows = (this.localStore.billing_invoices || []).filter(i => i.therapist_id === therapistId);
        }
        return rows.map(r => ({
            ...r,
            totalUSD: parseFloat(r.total_amount ?? r.totalUSD ?? r.total ?? 0),
            total_amount: parseFloat(r.total_amount ?? r.totalUSD ?? r.total ?? 0),
            amountUSD: parseFloat(r.subtotal ?? r.amountUSD ?? 0),
            subtotal: parseFloat(r.subtotal ?? r.amountUSD ?? 0),
            igtfUSD: parseFloat(r.igtf_amount ?? r.igtfUSD ?? 0),
            igtf_amount: parseFloat(r.igtf_amount ?? r.igtfUSD ?? 0)
        }));
    }
}

export const db = new DatabaseManager();
