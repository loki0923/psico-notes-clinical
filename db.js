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
            appointments: []
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
}

export const db = new DatabaseManager();
