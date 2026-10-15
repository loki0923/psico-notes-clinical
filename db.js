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
const LOCAL_DB_PATH = path.join(DATA_DIR, 'psiconotes_relational.json');

// Asegurar directorio local de datos
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

class DatabaseManager {
    constructor() {
        this.isPostgresConnected = false;
        this.pgPool = null;
        this.localStore = this._loadLocalStore();
    }

    _loadLocalStore() {
        try {
            if (fs.existsSync(LOCAL_DB_PATH)) {
                return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
            }
        } catch (e) {
            console.warn('⚠️ Error al leer almacén local, iniciando nuevo:', e.message);
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
            password_resets: {}
        };
    }

    _persistLocalStore() {
        try {
            fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(this.localStore, null, 2), 'utf8');
        } catch (e) {
            console.error('❌ Error persistiendo almacén de datos:', e.message);
        }
    }

    async initialize() {
        const dbUrl = process.env.DATABASE_URL;

        if (dbUrl) {
            try {
                const { default: pg } = await import('pg');
                const poolConfig = {
                    connectionString: dbUrl,
                    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
                    max: 10,
                    idleTimeoutMillis: 30000
                };
                this.pgPool = new pg.Pool(poolConfig);

                // Probar conexión
                const client = await this.pgPool.connect();
                console.log('🐘 PostgreSQL conectado exitosamente');
                
                // Aplicar schema DDL
                const schemaPath = path.join(__dirname, 'schema.sql');
                if (fs.existsSync(schemaPath)) {
                    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                    await client.query(schemaSql);
                    console.log('✅ Esquema DDL de PostgreSQL verificado y actualizado');
                }
                client.release();
                this.isPostgresConnected = true;
                return;
            } catch (err) {
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
                hasActiveCrisisAlert: alertsRes.rows.length > 0
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
            hasActiveCrisisAlert: this.localStore.crisis_alerts.some(a => a.patient_id === patientId && !a.acknowledged)
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

    async syncPatientsBatch(patientsArray, tasksArray = []) {
        for (const p of patientsArray) {
            await this.upsertPatient(p);
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
        const therapist = {
            id,
            name: data.name || '',
            email: (data.email || '').trim().toLowerCase(),
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
                await this.syncPatientsBatch(payload.patients, tasks);
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
}

export const db = new DatabaseManager();
