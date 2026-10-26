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
        if (!this.localStore.therapist_style_profiles) {
            this.localStore.therapist_style_profiles = {};
        }
        if (!this.localStore.therapy_roadmap_sessions) {
            this.localStore.therapy_roadmap_sessions = [];
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
            kid_portal_activities: [],
            therapist_style_profiles: {},
            therapy_roadmap_sessions: [],
            patient_documents: [],
            patient_payment_reports: []
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
                let pgAdapter = null;

                // Estrategia 1 (Cero dependencias, moderna y tolerante a entornos cloud/Render): Postgres.js
                try {
                    const { default: postgres } = await import('postgres');
                    const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
                    const sql = postgres(dbUrl, {
                        ssl: isLocal ? false : 'require',
                        max: 10,
                        idle_timeout: 30,
                        connect_timeout: 10
                    });

                    pgAdapter = {
                        async query(queryText, values = []) {
                            const rows = await sql.unsafe(queryText, values);
                            return { rows, rowCount: rows.length || (rows.count ?? 0) };
                        },
                        async connect() {
                            return {
                                query: async (queryText, values = []) => {
                                    const rows = await sql.unsafe(queryText, values);
                                    return { rows, rowCount: rows.length || (rows.count ?? 0) };
                                },
                                release: () => {}
                            };
                        }
                    };
                } catch (pgJsErr) {
                    // Estrategia 2: Fallback a node-postgres (pg)

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
                    pgAdapter = new pg.Pool(poolConfig);
                }

                this.pgPool = pgAdapter;

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
            const [pRes, tasksRes, cbtRes, moodsRes, evalsRes, alertsRes, appsRes] = await Promise.all([
                this.pgPool.query('SELECT * FROM patients WHERE id = $1', [patientId]),
                this.pgPool.query('SELECT * FROM patient_tasks WHERE patient_id = $1 ORDER BY created_at DESC', [patientId]),
                this.pgPool.query('SELECT * FROM cbt_records WHERE patient_id = $1 ORDER BY created_at DESC', [patientId]),
                this.pgPool.query('SELECT * FROM mood_logs WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 30', [patientId]),
                this.pgPool.query('SELECT * FROM evaluations WHERE patient_id = $1 ORDER BY created_at DESC', [patientId]),
                this.pgPool.query('SELECT * FROM crisis_alerts WHERE patient_id = $1 AND acknowledged = FALSE ORDER BY created_at DESC LIMIT 1', [patientId]),
                this.pgPool.query('SELECT * FROM appointments WHERE patient_id = $1 ORDER BY appointment_date ASC, appointment_time ASC', [patientId]).catch(() => ({ rows: [] }))
            ]);

            const patient = pRes.rows[0];
            if (!patient) return null;

            const normalizedAppointments = (appsRes.rows || []).map(r => ({
                id: r.id,
                patientId: r.patient_id,
                patient_id: r.patient_id,
                date: r.appointment_date instanceof Date ? r.appointment_date.toISOString().split('T')[0] : String(r.appointment_date).split('T')[0],
                time: String(r.appointment_time || '').substring(0, 5),
                duration: Number(r.duration) || 50,
                status: r.status || 'agendada',
                attendanceConfirmed: Boolean(r.attendance_confirmed || r.status === 'confirmada'),
                type: r.type || 'Online',
                notes: r.notes || '',
                createdAt: r.created_at
            }));

            const therapistRes = patient.therapist_id 
                ? await this.pgPool.query('SELECT * FROM therapists WHERE id = $1', [patient.therapist_id]).catch(() => ({ rows: [] }))
                : { rows: [] };
            const therapist = therapistRes.rows[0] || {};
            const therapistInfo = {
                name: therapist.name || patient.therapist_name || 'Licenciado(a) en Psicología',
                specialty: therapist.specialty || patient.therapist_specialty || 'Psicología Clínica y de la Salud',
                registryNumber: therapist.registry_number || patient.therapist_registry || 'FPV Nº 54567',
                email: therapist.email || 'terapia.clinica@gmail.com',
                phone: therapist.phone || '+58 414-0000000',
                location: therapist.institution || 'Consultorio Clínico / Consulta Online y Presencial'
            };
            const documents = await this.getPatientDocuments(patientId);
            const paymentReports = await this.getPatientPaymentReports(patientId);
            const paymentMethods = await this.getTherapistPaymentMethods(patient.therapist_id);

            return {
                patient,
                therapistInfo,
                paymentMethods,
                documents,
                paymentReports,
                tasks: tasksRes.rows,
                cbtRecords: cbtRes.rows,
                moodLogs: moodsRes.rows,
                evaluations: evalsRes.rows,
                hasActiveCrisisAlert: alertsRes.rows.length > 0,
                kidActivities: await this.getKidActivities(patientId),
                appointments: normalizedAppointments
            };
        }

        const patient = this.localStore.patients.find(p => p.id === patientId);
        if (!patient) return null;

        const therapist = (this.localStore.therapists || []).find(t => t.id === patient.therapist_id) || {};
        const therapistInfo = {
            name: therapist.name || patient.therapist_name || 'Licenciado(a) en Psicología',
            specialty: therapist.specialty || patient.therapist_specialty || 'Psicología Clínica y de la Salud',
            registryNumber: therapist.registry_number || patient.therapist_registry || 'FPV Nº 54567',
            email: therapist.email || 'terapia.clinica@gmail.com',
            phone: therapist.phone || '+58 414-0000000',
            location: therapist.institution || 'Consultorio Clínico / Consulta Online y Presencial'
        };

        const localApps = (this.localStore.appointments || [])
            .filter(a => String(a.patient_id || a.patientId) === String(patientId))
            .map(a => ({
                id: a.id,
                patientId: a.patientId || a.patient_id,
                patient_id: a.patientId || a.patient_id,
                date: a.date || a.appointment_date,
                time: String(a.time || a.appointment_time || '').substring(0, 5),
                duration: Number(a.duration) || 50,
                status: a.status || 'agendada',
                attendanceConfirmed: Boolean(a.attendance_confirmed || a.attendanceConfirmed || a.status === 'confirmada'),
                type: a.type || 'Online',
                notes: a.notes || '',
                createdAt: a.createdAt || a.created_at || new Date().toISOString()
            }));

        const documents = await this.getPatientDocuments(patientId);
        const paymentReports = await this.getPatientPaymentReports(patientId);
        const paymentMethods = await this.getTherapistPaymentMethods(patient.therapist_id);

        return {
            patient,
            therapistInfo,
            paymentMethods,
            documents,
            paymentReports,
            tasks: (this.localStore.patient_tasks || []).filter(t => t.patient_id === patientId),
            cbtRecords: (this.localStore.cbt_records || []).filter(c => c.patient_id === patientId),
            moodLogs: (this.localStore.mood_logs || []).filter(m => m.patient_id === patientId),
            evaluations: (this.localStore.evaluations || []).filter(e => e.patient_id === patientId),
            hasActiveCrisisAlert: (this.localStore.crisis_alerts || []).some(a => a.patient_id === patientId && !a.acknowledged),
            kidActivities: (this.localStore.kid_portal_activities || []).filter(k => k.patient_id === patientId),
            appointments: localApps
        };
    }

    async addMoodLog(patientId, { mood, sleep, energy, note, word }) {
        const record = {
            id: `mood_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            patient_id: patientId,
            mood_score: Number(mood) || 3,
            sleep_score: Number(sleep) || 3,
            energy_score: Number(energy) || 3,
            note: note || '',
            word: word || '',
            created_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            try {
                const res = await this.pgPool.query(
                    `INSERT INTO mood_logs (id, patient_id, mood_score, sleep_score, energy_score, note, word, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                    [record.id, record.patient_id, record.mood_score, record.sleep_score, record.energy_score, record.note, record.word, record.created_at]
                );
                return res.rows[0];
            } catch (err) {
                const res = await this.pgPool.query(
                    `INSERT INTO mood_logs (id, patient_id, mood_score, sleep_score, energy_score, note, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                    [record.id, record.patient_id, record.mood_score, record.sleep_score, record.energy_score, record.note, record.created_at]
                );
                return { ...res.rows[0], word: record.word };
            }
        }

        if (!this.localStore.mood_logs) this.localStore.mood_logs = [];
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

    async getTherapistAvailability(therapistId, dateStr, patientId = null) {
        if (!dateStr) {
            const tmrw = new Date();
            tmrw.setDate(tmrw.getDate() + 1);
            dateStr = tmrw.toISOString().split('T')[0];
        }

        const candidateSlots = [
            { time: '08:00', label: '08:00 AM', shift: 'morning', recommended: false },
            { time: '09:00', label: '09:00 AM', shift: 'morning', recommended: true },
            { time: '10:00', label: '10:00 AM', shift: 'morning', recommended: true },
            { time: '11:00', label: '11:00 AM', shift: 'morning', recommended: false },
            { time: '12:00', label: '12:00 PM', shift: 'morning', recommended: false },
            { time: '14:00', label: '02:00 PM', shift: 'afternoon', recommended: false },
            { time: '15:00', label: '03:00 PM', shift: 'afternoon', recommended: true },
            { time: '16:00', label: '04:00 PM', shift: 'afternoon', recommended: true },
            { time: '17:00', label: '05:00 PM', shift: 'afternoon', recommended: false },
            { time: '18:00', label: '06:00 PM', shift: 'afternoon', recommended: false }
        ];

        const [y, m, d] = dateStr.split('-').map(Number);
        const targetDate = new Date(y, m - 1, d, 12, 0, 0);
        const dayOfWeek = targetDate.getDay();
        const isSunday = dayOfWeek === 0;

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayName = dayNames[dayOfWeek] || '';

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let occupiedApps = [];

        if (this.isPostgresConnected && this.pgPool) {
            try {
                const res = await this.pgPool.query(
                    `SELECT a.id, a.patient_id, a.appointment_date, a.appointment_time, a.duration, a.status
                     FROM appointments a
                     LEFT JOIN patients p ON a.patient_id = p.id
                     WHERE (p.therapist_id = $1 OR a.patient_id = $2 OR $1 IS NULL)
                       AND a.appointment_date = $3
                       AND a.status NOT IN ('cancelada')`,
                    [therapistId || null, patientId || null, dateStr]
                );
                occupiedApps = res.rows.map(r => ({
                    time: String(r.appointment_time || '').substring(0, 5),
                    duration: Number(r.duration) || 50
                }));
            } catch (err) {
                console.warn('[DB] Error consultando citas para disponibilidad:', err.message);
            }
        } else {
            const therapistPatientIds = new Set(
                (this.localStore.patients || [])
                    .filter(p => !therapistId || p.therapist_id === therapistId || p.therapistId === therapistId)
                    .map(p => p.id)
            );
            if (patientId) therapistPatientIds.add(patientId);

            occupiedApps = (this.localStore.appointments || [])
                .filter(a => {
                    const aDate = (a.date || a.appointment_date || '').toString().split('T')[0];
                    if (aDate !== dateStr) return false;
                    if (a.status === 'cancelada') return false;
                    const pId = a.patientId || a.patient_id;
                    if (therapistId && !therapistPatientIds.has(pId) && (!patientId || pId !== patientId)) return false;
                    return true;
                })
                .map(a => ({
                    time: String(a.time || a.appointment_time || '').substring(0, 5),
                    duration: Number(a.duration) || 50
                }));
        }

        const slots = candidateSlots.map(slot => {
            const [sh, sm] = slot.time.split(':').map(Number);
            const slotStart = sh * 60 + sm;
            const slotEnd = slotStart + 50;

            if (isSunday) {
                return {
                    ...slot,
                    available: false,
                    reason: 'Día no laborable (Domingo)'
                };
            }

            if (isToday && slotStart <= currentMinutes + 15) {
                return {
                    ...slot,
                    available: false,
                    reason: 'Horario pasado'
                };
            }

            const conflict = occupiedApps.some(app => {
                const [ah, am] = (app.time || '00:00').split(':').map(Number);
                const appStart = ah * 60 + am;
                const appEnd = appStart + (app.duration || 50);
                return Math.max(slotStart, appStart) < Math.min(slotEnd, appEnd);
            });

            if (conflict) {
                return {
                    ...slot,
                    available: false,
                    reason: 'Horario ocupado'
                };
            }

            return {
                ...slot,
                available: true,
                reason: null
            };
        });

        const totalAvailable = slots.filter(s => s.available).length;
        const totalOccupied = slots.filter(s => !s.available && s.reason === 'Horario ocupado').length;

        return {
            date: dateStr,
            dayName,
            isWorkingDay: !isSunday,
            slots,
            availableSlots: slots.filter(s => s.available),
            totalAvailable,
            totalOccupied,
            message: isSunday ? 'El consultorio no atiende los domingos. Por favor selecciona de lunes a sábado.' : (totalAvailable === 0 ? 'No hay disponibilidad para esta fecha.' : 'Horarios disponibles encontrados.')
        };
    }

    async isSlotAvailable(therapistId, dateStr, timeStr, patientId = null) {
        if (!dateStr || !timeStr) return false;
        const cleanTime = String(timeStr).substring(0, 5);
        const availability = await this.getTherapistAvailability(therapistId, dateStr, patientId);
        if (!availability.isWorkingDay) return false;
        const slot = availability.slots.find(s => s.time === cleanTime);
        return slot ? Boolean(slot.available) : false;
    }

    async getTherapistAppointments(therapistId) {
        if (!therapistId) return [];

        if (this.isPostgresConnected && this.pgPool) {
            try {
                const res = await this.pgPool.query(
                    `SELECT a.id, a.patient_id, a.appointment_date, a.appointment_time,
                            a.duration, a.status, a.notes, a.created_at
                     FROM appointments a
                     JOIN patients p ON a.patient_id = p.id
                     WHERE p.therapist_id = $1
                     ORDER BY a.appointment_date ASC, a.appointment_time ASC`,
                    [therapistId]
                );
                return res.rows.map(r => ({
                    id: r.id,
                    patientId: r.patient_id,
                    patient_id: r.patient_id,
                    date: r.appointment_date instanceof Date ? r.appointment_date.toISOString().split('T')[0] : String(r.appointment_date).split('T')[0],
                    time: String(r.appointment_time || '').substring(0, 5),
                    duration: Number(r.duration) || 50,
                    status: r.status || 'agendada',
                    type: r.type || 'Online',
                    notes: r.notes || '',
                    createdAt: r.created_at
                }));
            } catch (err) {
                console.warn('[DB] Error consultando citas del terapeuta:', err.message);
                return [];
            }
        }

        const therapistPatients = new Set(
            (this.localStore.patients || [])
                .filter(p => p.therapist_id === therapistId || p.therapistId === therapistId)
                .map(p => p.id)
        );

        return (this.localStore.appointments || [])
            .filter(a => therapistPatients.has(a.patientId || a.patient_id))
            .map(a => ({
                id: a.id,
                patientId: a.patientId || a.patient_id,
                patient_id: a.patientId || a.patient_id,
                date: (a.date || a.appointment_date || '').toString().split('T')[0],
                time: String(a.time || a.appointment_time || '').substring(0, 5),
                duration: Number(a.duration) || 50,
                status: a.status || 'agendada',
                type: a.type || 'Online',
                notes: a.notes || '',
                createdAt: a.createdAt || a.created_at || new Date().toISOString()
            }));
    }

    async createPortalAppointment(patientId, { date, time, duration = 50, type = 'Online', notes = '' }) {
        if (!patientId || !date || !time) {
            throw new Error('patientId, date y time son requeridos');
        }

        const id = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const status = 'agendada';
        const createdAt = new Date().toISOString();

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `INSERT INTO appointments (id, patient_id, appointment_date, appointment_time, duration, status, notes, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [id, patientId, date, time, Number(duration) || 50, status, notes, createdAt]
            );
            const r = res.rows[0];
            return {
                id: r.id,
                patientId: r.patient_id,
                patient_id: r.patient_id,
                date: r.appointment_date instanceof Date ? r.appointment_date.toISOString().split('T')[0] : String(r.appointment_date).split('T')[0],
                time: String(r.appointment_time || '').substring(0, 5),
                duration: Number(r.duration) || 50,
                status: r.status,
                type,
                notes: r.notes || '',
                createdAt: r.created_at
            };
        }

        if (!Array.isArray(this.localStore.appointments)) {
            this.localStore.appointments = [];
        }

        const record = {
            id,
            patientId,
            patient_id: patientId,
            date,
            time: String(time).substring(0, 5),
            duration: Number(duration) || 50,
            type,
            status,
            notes,
            createdAt
        };

        this.localStore.appointments.unshift(record);
        this._persistLocalStore();
        return record;
    }

    getDefaultPaymentMethods(therapist = {}, billingConfig = {}) {
        return [
            {
                id: 'pago_movil',
                name: 'Pago Móvil Interbancario',
                icon: '📱',
                bank: 'Banesco (0134) / Mercantil (0105)',
                idNumber: billingConfig.rif || 'V-15890123',
                phone: billingConfig.phone || therapist.phone || '0414-2345678',
                instructions: 'Registrar la referencia bancaria al completar la transferencia.',
                enabled: true
            },
            {
                id: 'zelle',
                name: 'Zelle (USD)',
                icon: '💵',
                email: therapist.email || 'terapia.clinica@gmail.com',
                holder: therapist.name || 'Dr. Terapeuta Clínico',
                instructions: 'Indicar únicamente el nombre del paciente en la nota o memo.',
                enabled: true
            },
            {
                id: 'transferencia',
                name: 'Transferencia Bancaria Nacional',
                icon: '🏦',
                bank: 'Banesco Banco Universal',
                accountNumber: '0134-0987-65-0123456789',
                holder: billingConfig.fiscal_name || therapist.name || 'Consulta Psicológica',
                idNumber: billingConfig.rif || 'V-15890123',
                instructions: 'Acreditación inmediata para cuentas del mismo banco.',
                enabled: true
            },
            {
                id: 'binance',
                name: 'Binance Pay / Cripto (USDT)',
                icon: '🟡',
                payId: '892341052',
                network: 'USDT (Red TRC20 / BEP20)',
                instructions: 'Transferencias directas con 0% comisión mediante Binance Pay ID.',
                enabled: true
            },
            {
                id: 'efectivo',
                name: 'Efectivo en Consulta',
                icon: '💶',
                currency: 'USD / EUR / VES',
                instructions: 'Pago directo en recepción previo al inicio de su sesión presencial.',
                enabled: true
            }
        ];
    }

    async getTherapistPaymentMethods(therapistId) {
        if (!therapistId) return this.getDefaultPaymentMethods();

        if (this.isPostgresConnected && this.pgPool) {
            try {
                const res = await this.pgPool.query('SELECT payment_methods FROM therapists WHERE id = $1', [therapistId]);
                if (res.rows && res.rows[0] && Array.isArray(res.rows[0].payment_methods) && res.rows[0].payment_methods.length > 0) {
                    return res.rows[0].payment_methods;
                }
            } catch (e) {}
        }

        if (this.localStore?.therapist_payment_methods && Array.isArray(this.localStore.therapist_payment_methods[therapistId]) && this.localStore.therapist_payment_methods[therapistId].length > 0) {
            return this.localStore.therapist_payment_methods[therapistId];
        }

        const therapist = (this.localStore?.therapists || []).find(t => String(t.id) === String(therapistId)) || {};
        const billingConfig = (this.localStore?.billing_configs && this.localStore.billing_configs[therapistId]) || {};

        return this.getDefaultPaymentMethods(therapist, billingConfig);
    }

    async saveTherapistPaymentMethods(therapistId, paymentMethods) {
        if (!therapistId) throw new Error('therapistId requerido');
        if (!Array.isArray(paymentMethods)) throw new Error('paymentMethods debe ser un arreglo');

        if (this.isPostgresConnected && this.pgPool) {
            try {
                await this.pgPool.query(
                    `UPDATE therapists 
                     SET payment_methods = $2::jsonb, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $1`,
                    [therapistId, JSON.stringify(paymentMethods)]
                );
            } catch (err) {
                console.warn('[DB] Error guardando payment_methods en PostgreSQL:', err.message);
            }
        }

        if (!this.localStore.therapist_payment_methods) {
            this.localStore.therapist_payment_methods = {};
        }
        this.localStore.therapist_payment_methods[therapistId] = paymentMethods;
        this._persistLocalStore();

        return paymentMethods;
    }

    async confirmAppointmentAttendance(appointmentId, patientId = null) {
        if (!appointmentId) throw new Error('appointmentId requerido');

        if (this.isPostgresConnected && this.pgPool) {
            let res;
            if (patientId) {
                res = await this.pgPool.query(
                    `UPDATE appointments 
                     SET attendance_confirmed = TRUE,
                         status = CASE WHEN status = 'completada' THEN 'completada' ELSE 'confirmada' END
                     WHERE id = $1 AND patient_id = $2
                     RETURNING *`,
                    [appointmentId, patientId]
                );
            } else {
                res = await this.pgPool.query(
                    `UPDATE appointments 
                     SET attendance_confirmed = TRUE,
                         status = CASE WHEN status = 'completada' THEN 'completada' ELSE 'confirmada' END
                     WHERE id = $1
                     RETURNING *`,
                    [appointmentId]
                );
            }
            if (res.rows && res.rows[0]) {
                const r = res.rows[0];
                return {
                    id: r.id,
                    patientId: r.patient_id,
                    date: r.appointment_date instanceof Date ? r.appointment_date.toISOString().split('T')[0] : String(r.appointment_date).split('T')[0],
                    time: String(r.appointment_time || '').substring(0, 5),
                    duration: Number(r.duration) || 50,
                    status: r.status,
                    attendanceConfirmed: true,
                    notes: r.notes || ''
                };
            }
            return null;
        }

        const app = (this.localStore.appointments || []).find(a => 
            String(a.id) === String(appointmentId) && (!patientId || String(a.patientId || a.patient_id) === String(patientId))
        );
        if (!app) return null;

        app.attendance_confirmed = true;
        app.attendanceConfirmed = true;
        if (app.status !== 'completada') {
            app.status = 'confirmada';
        }
        app.updatedAt = new Date().toISOString();
        this._persistLocalStore();
        return app;
    }

    async updateAppointmentStatus(appointmentId, { status, notes, date, time, duration, therapistId = null } = {}) {
        if (!appointmentId) throw new Error('appointmentId requerido');

        if (this.isPostgresConnected && this.pgPool) {
            const fields = [];
            const values = [appointmentId];
            let pIndex = 2;

            if (status) {
                fields.push(`status = $${pIndex++}`);
                values.push(status);
            }
            if (notes !== undefined) {
                fields.push(`notes = $${pIndex++}`);
                values.push(notes);
            }
            if (date) {
                fields.push(`appointment_date = $${pIndex++}`);
                values.push(date);
            }
            if (time) {
                fields.push(`appointment_time = $${pIndex++}`);
                values.push(time);
            }
            if (duration) {
                fields.push(`duration = $${pIndex++}`);
                values.push(Number(duration) || 50);
            }

            if (fields.length > 0) {
                const query = `UPDATE appointments SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
                const res = await this.pgPool.query(query, values);
                if (res.rows && res.rows[0]) {
                    const r = res.rows[0];
                    return {
                        id: r.id,
                        patientId: r.patient_id,
                        patient_id: r.patient_id,
                        date: r.appointment_date instanceof Date ? r.appointment_date.toISOString().split('T')[0] : String(r.appointment_date).split('T')[0],
                        time: String(r.appointment_time || '').substring(0, 5),
                        duration: Number(r.duration) || 50,
                        status: r.status,
                        notes: r.notes || '',
                        attendanceConfirmed: Boolean(r.attendance_confirmed),
                        createdAt: r.created_at
                    };
                }
            }
        }

        if (!Array.isArray(this.localStore.appointments)) {
            this.localStore.appointments = [];
        }

        const app = this.localStore.appointments.find(a => String(a.id) === String(appointmentId));
        if (!app) return null;

        if (status) app.status = status;
        if (notes !== undefined) app.notes = notes;
        if (date) {
            app.date = date;
            app.appointment_date = date;
        }
        if (time) {
            app.time = String(time).substring(0, 5);
            app.appointment_time = String(time).substring(0, 5);
        }
        if (duration) app.duration = Number(duration) || 50;
        app.updatedAt = new Date().toISOString();

        this._persistLocalStore();
        return app;
    }

    async deleteAppointment(appointmentId, therapistId = null) {
        if (!appointmentId) throw new Error('appointmentId requerido');

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `UPDATE appointments SET status = 'cancelada' WHERE id = $1 RETURNING *`,
                [appointmentId]
            );
            return res.rows && res.rows.length > 0;
        }

        if (!Array.isArray(this.localStore.appointments)) return false;
        const app = this.localStore.appointments.find(a => String(a.id) === String(appointmentId));
        if (app) {
            app.status = 'cancelada';
            app.updatedAt = new Date().toISOString();
            this._persistLocalStore();
            return true;
        }
        return false;
    }

    async syncTherapistAppointments(therapistId, appointmentsList) {
        if (!Array.isArray(appointmentsList)) return [];
        const results = [];
        for (const app of appointmentsList) {
            if (!app || !app.id || !app.patientId || !app.date) continue;
            const pId = app.patientId || app.patient_id;
            const aDate = (app.date || app.appointment_date || '').toString().split('T')[0];
            const aTime = String(app.time || app.appointment_time || '10:00').substring(0, 5);
            const aDuration = Number(app.duration) || 50;
            const aStatus = app.status || 'agendada';
            const aNotes = app.notes || '';

            if (this.isPostgresConnected && this.pgPool) {
                const res = await this.pgPool.query(
                    `INSERT INTO appointments (id, patient_id, appointment_date, appointment_time, duration, status, notes)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT (id) DO UPDATE SET
                        appointment_date = EXCLUDED.appointment_date,
                        appointment_time = EXCLUDED.appointment_time,
                        duration = EXCLUDED.duration,
                        status = EXCLUDED.status,
                        notes = EXCLUDED.notes
                     RETURNING *`,
                    [app.id, pId, aDate, aTime, aDuration, aStatus, aNotes]
                ).catch(() => null);
                if (res && res.rows[0]) results.push(res.rows[0]);
            } else {
                if (!Array.isArray(this.localStore.appointments)) this.localStore.appointments = [];
                const idx = this.localStore.appointments.findIndex(a => String(a.id) === String(app.id));
                const record = {
                    id: app.id,
                    patientId: pId,
                    patient_id: pId,
                    date: aDate,
                    appointment_date: aDate,
                    time: aTime,
                    appointment_time: aTime,
                    duration: aDuration,
                    status: aStatus,
                    notes: aNotes,
                    updatedAt: new Date().toISOString()
                };
                if (idx >= 0) {
                    this.localStore.appointments[idx] = { ...this.localStore.appointments[idx], ...record };
                } else {
                    this.localStore.appointments.unshift(record);
                }
                results.push(record);
            }
        }
        if (!this.isPostgresConnected) {
            this._persistLocalStore();
        }
        return results;
    }

    async savePatientDocument(patientId, therapistId, docData) {
        if (!patientId || !docData.fileName) throw new Error('patientId y fileName son requeridos');
        const record = {
            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            patient_id: patientId,
            therapist_id: therapistId || null,
            title: docData.title || docData.fileName,
            category: docData.category || 'general',
            file_name: docData.fileName || docData.file_name,
            file_type: docData.fileType || docData.file_type || 'application/octet-stream',
            file_size: Number(docData.fileSize || docData.file_size) || 0,
            file_data: docData.fileData || docData.file_data || '',
            uploaded_by: docData.uploadedBy || docData.uploaded_by || 'patient',
            notes: docData.notes || '',
            created_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `INSERT INTO patient_documents 
                 (id, patient_id, therapist_id, title, category, file_name, file_type, file_size, file_data, uploaded_by, notes, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 RETURNING *`,
                [record.id, record.patient_id, record.therapist_id, record.title, record.category, record.file_name, record.file_type, record.file_size, record.file_data, record.uploaded_by, record.notes, record.created_at]
            );
            return res.rows[0];
        }

        if (!this.localStore.patient_documents) this.localStore.patient_documents = [];
        this.localStore.patient_documents.unshift(record);
        this._persistLocalStore();
        return record;
    }

    async getPatientDocuments(patientId) {
        if (!patientId) return [];

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `SELECT id, patient_id, therapist_id, title, category, file_name, file_type, file_size, 
                        file_data, uploaded_by, notes, created_at
                 FROM patient_documents 
                 WHERE patient_id = $1 
                 ORDER BY created_at DESC`,
                [patientId]
            );
            return res.rows;
        }

        if (!this.localStore.patient_documents) this.localStore.patient_documents = [];
        return (this.localStore.patient_documents || [])
            .filter(d => String(d.patient_id || d.patientId) === String(patientId))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    async deletePatientDocument(documentId, patientId = null) {
        if (!documentId) return false;

        if (this.isPostgresConnected && this.pgPool) {
            let res;
            if (patientId) {
                res = await this.pgPool.query('DELETE FROM patient_documents WHERE id = $1 AND patient_id = $2 RETURNING id', [documentId, patientId]);
            } else {
                res = await this.pgPool.query('DELETE FROM patient_documents WHERE id = $1 RETURNING id', [documentId]);
            }
            return (res.rowCount || 0) > 0;
        }

        if (!this.localStore.patient_documents) return false;
        const initialLen = this.localStore.patient_documents.length;
        this.localStore.patient_documents = this.localStore.patient_documents.filter(d => {
            if (String(d.id) !== String(documentId)) return true;
            if (patientId && String(d.patient_id || d.patientId) !== String(patientId)) return true;
            return false;
        });
        const deleted = this.localStore.patient_documents.length < initialLen;
        if (deleted) this._persistLocalStore();
        return deleted;
    }

    async savePaymentReport(patientId, therapistId, reportData) {
        if (!patientId || !reportData.amount || !reportData.reference) {
            throw new Error('patientId, amount y reference son requeridos');
        }

        if (!therapistId) {
            if (this.isPostgresConnected && this.pgPool) {
                try {
                    const patRes = await this.pgPool.query(`SELECT therapist_id FROM patients WHERE id = $1`, [patientId]);
                    if (patRes.rows.length > 0 && patRes.rows[0].therapist_id) {
                        therapistId = patRes.rows[0].therapist_id;
                    }
                } catch (e) {}
            } else {
                const pat = (this.localStore.patients || []).find(p => p.id === patientId);
                if (pat && (pat.therapist_id || pat.therapistId)) {
                    therapistId = pat.therapist_id || pat.therapistId;
                }
            }
        }

        const record = {
            id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            patient_id: patientId,
            therapist_id: therapistId || null,
            amount: Number(reportData.amount) || 0,
            currency: reportData.currency || 'USD',
            payment_method: reportData.paymentMethod || reportData.payment_method || 'pago_movil',
            reference: String(reportData.reference).trim(),
            payment_date: reportData.paymentDate || reportData.payment_date || new Date().toISOString().split('T')[0],
            concept: reportData.concept || 'Sesión de psicoterapia',
            receipt_data: reportData.receiptData || reportData.receipt_data || '',
            status: 'pendiente',
            therapist_notes: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `INSERT INTO patient_payment_reports 
                 (id, patient_id, therapist_id, amount, currency, payment_method, reference, payment_date, concept, receipt_data, status, therapist_notes, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                 RETURNING *`,
                [record.id, record.patient_id, record.therapist_id, record.amount, record.currency, record.payment_method, record.reference, record.payment_date, record.concept, record.receipt_data, record.status, record.therapist_notes, record.created_at, record.updated_at]
            );
            return res.rows[0];
        }

        if (!this.localStore.patient_payment_reports) this.localStore.patient_payment_reports = [];
        this.localStore.patient_payment_reports.unshift(record);
        this._persistLocalStore();
        return record;
    }

    async getPatientPaymentReports(patientId) {
        if (!patientId) return [];

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `SELECT * FROM patient_payment_reports 
                 WHERE patient_id = $1 
                 ORDER BY created_at DESC`,
                [patientId]
            );
            return res.rows;
        }

        if (!this.localStore.patient_payment_reports) this.localStore.patient_payment_reports = [];
        return (this.localStore.patient_payment_reports || [])
            .filter(p => String(p.patient_id || p.patientId) === String(patientId))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    async getTherapistPaymentReports(therapistId) {
        if (!therapistId) return [];

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `SELECT r.*, p.name as patient_name
                 FROM patient_payment_reports r
                 LEFT JOIN patients p ON r.patient_id = p.id
                 WHERE r.therapist_id = $1 OR p.therapist_id = $1
                 ORDER BY r.created_at DESC`,
                [therapistId]
            );
            return res.rows;
        }

        if (!this.localStore.patient_payment_reports) this.localStore.patient_payment_reports = [];
        const patients = (this.localStore.patients || []).filter(p => p.therapist_id === therapistId || p.therapistId === therapistId);
        const patientIds = new Set(patients.map(p => p.id));
        return (this.localStore.patient_payment_reports || [])
            .filter(r => r.therapist_id === therapistId || patientIds.has(r.patient_id) || !r.therapist_id)
            .map(r => {
                const pat = (this.localStore.patients || []).find(p => p.id === r.patient_id);
                return {
                    ...r,
                    patient_name: pat ? pat.name : 'Paciente'
                };
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    async updatePaymentReportStatus(reportId, therapistId, status, notes = '') {
        if (!reportId || !status) throw new Error('reportId y status son requeridos');

        if (this.isPostgresConnected && this.pgPool) {
            let res;
            if (therapistId) {
                res = await this.pgPool.query(
                    `UPDATE patient_payment_reports 
                     SET status = $1, therapist_notes = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3 AND (therapist_id = $4 OR therapist_id IS NULL)
                     RETURNING *`,
                    [status, notes, reportId, therapistId]
                );
            } else {
                res = await this.pgPool.query(
                    `UPDATE patient_payment_reports 
                     SET status = $1, therapist_notes = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3
                     RETURNING *`,
                    [status, notes, reportId]
                );
            }
            return res.rows[0] || null;
        }

        if (!this.localStore.patient_payment_reports) return null;
        const report = this.localStore.patient_payment_reports.find(p => String(p.id) === String(reportId));
        if (!report) return null;

        report.status = status;
        if (notes) report.therapist_notes = notes;
        report.updated_at = new Date().toISOString();
        this._persistLocalStore();
        return report;
    }

    async updatePatientProfile(patientId, profileData) {
        if (!patientId) throw new Error('patientId requerido');

        if (this.isPostgresConnected && this.pgPool) {
            const patientRes = await this.pgPool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
            const p = patientRes.rows[0];
            if (!p) return null;

            const name = profileData.name !== undefined ? profileData.name : p.name;
            const phone = profileData.phone !== undefined ? profileData.phone : p.phone;
            const email = profileData.email !== undefined ? profileData.email : p.email;
            const occupation = profileData.occupation !== undefined ? profileData.occupation : p.occupation;
            const emergency_contact = profileData.emergencyContact !== undefined ? profileData.emergencyContact : p.emergency_contact;
            const emergency_phone = profileData.emergencyPhone !== undefined ? profileData.emergencyPhone : p.emergency_phone;
            const address = profileData.address !== undefined ? profileData.address : p.address;
            const expectations = profileData.expectations !== undefined ? profileData.expectations : (p.preconsulta_data?.expectations || '');
            const birthdate = profileData.birthdate !== undefined ? profileData.birthdate : p.birthdate;

            const preconsulta = { ...(p.preconsulta_data || {}), expectations, patientUpdatedProfile: true };

            const res = await this.pgPool.query(
                `UPDATE patients 
                 SET name = $1, phone = $2, email = $3, occupation = $4, emergency_contact = $5,
                     emergency_phone = $6, address = $7, birthdate = $8, preconsulta_data = $9,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $10
                 RETURNING *`,
                [name, phone, email, occupation, emergency_contact, emergency_phone, address, birthdate, JSON.stringify(preconsulta), patientId]
            );
            return res.rows[0];
        }

        const patient = (this.localStore.patients || []).find(p => String(p.id) === String(patientId));
        if (!patient) return null;

        if (profileData.name !== undefined) patient.name = profileData.name;
        if (profileData.phone !== undefined) patient.phone = profileData.phone;
        if (profileData.email !== undefined) patient.email = profileData.email;
        if (profileData.occupation !== undefined) patient.occupation = profileData.occupation;
        if (profileData.emergencyContact !== undefined) patient.emergencyContact = profileData.emergencyContact;
        if (profileData.emergencyPhone !== undefined) patient.emergencyPhone = profileData.emergencyPhone;
        if (profileData.emergency_contact !== undefined) patient.emergency_contact = profileData.emergency_contact;
        if (profileData.emergency_phone !== undefined) patient.emergency_phone = profileData.emergency_phone;
        if (profileData.address !== undefined) patient.address = profileData.address;
        if (profileData.birthdate !== undefined) patient.birthdate = profileData.birthdate;
        if (profileData.expectations !== undefined) {
            patient.expectations = profileData.expectations;
            patient.preconsulta_data = patient.preconsulta_data || {};
            patient.preconsulta_data.expectations = profileData.expectations;
        }
        patient.updatedAt = new Date().toISOString();
        this._persistLocalStore();
        return patient;
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
            const patientId = t.patient_id || t.patientId;
            const title = t.title || t.text;
            if (t.id && patientId && title) {
                const deadline = t.deadline || t.dueDate || null;
                const completed = Boolean(t.completed);
                const description = t.description || '';
                const createdAt = t.created_at || t.assignedAt || new Date().toISOString();
                if (this.isPostgresConnected && this.pgPool) {
                    await this.pgPool.query(`
                        INSERT INTO patient_tasks (id, patient_id, title, description, deadline, completed, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (id) DO UPDATE SET
                            title = EXCLUDED.title,
                            description = EXCLUDED.description,
                            deadline = EXCLUDED.deadline,
                            completed = EXCLUDED.completed
                    `, [t.id, patientId, title, description, deadline, completed, createdAt]);
                } else {
                    const idx = this.localStore.patient_tasks.findIndex(existing => existing.id === t.id);
                    const taskRecord = {
                        id: t.id,
                        patient_id: patientId,
                        patientId: patientId,
                        title,
                        description,
                        deadline,
                        dueDate: deadline,
                        completed,
                        created_at: createdAt
                    };
                    if (idx >= 0) this.localStore.patient_tasks[idx] = { ...this.localStore.patient_tasks[idx], ...taskRecord };
                    else this.localStore.patient_tasks.push(taskRecord);
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
                    .flatMap(n => (n.intersessionTasks || []).map(t => ({
                        id: t.id || `task_${Math.random().toString(36).substr(2, 6)}`,
                        patient_id: t.patient_id || t.patientId || n.patientId,
                        patientId: t.patient_id || t.patientId || n.patientId,
                        title: t.title || t.text,
                        description: t.description || '',
                        deadline: t.deadline || t.dueDate || null,
                        dueDate: t.dueDate || t.deadline || null,
                        completed: Boolean(t.completed),
                        created_at: t.created_at || t.assignedAt || n.date || new Date().toISOString()
                    })))
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

    // ============================================
    // MÉTODOS DE PERFIL DE ESTILO DEL TERAPEUTA (HEYFREUD BENCHMARK)
    // ============================================

    async getTherapistStyleProfile(therapistId) {
        if (!therapistId) return null;
        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                'SELECT profile FROM therapist_style_profiles WHERE therapist_id = $1',
                [therapistId]
            );
            return res.rows[0]?.profile || null;
        }
        if (!this.localStore.therapist_style_profiles) {
            this.localStore.therapist_style_profiles = {};
        }
        return this.localStore.therapist_style_profiles[therapistId] || null;
    }

    async saveTherapistStyleProfile(therapistId, profileData) {
        if (!therapistId) throw new Error('therapistId requerido para guardar perfil de estilo.');
        const cleanProfile = typeof profileData === 'object' && profileData !== null ? profileData : {};

        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `INSERT INTO therapist_style_profiles (therapist_id, profile, updated_at)
                 VALUES ($1, $2, CURRENT_TIMESTAMP)
                 ON CONFLICT (therapist_id) DO UPDATE SET
                     profile = EXCLUDED.profile,
                     updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [therapistId, JSON.stringify(cleanProfile)]
            );
            return res.rows[0]?.profile || cleanProfile;
        }

        if (!this.localStore.therapist_style_profiles) {
            this.localStore.therapist_style_profiles = {};
        }
        this.localStore.therapist_style_profiles[therapistId] = cleanProfile;
        this._persistLocalStore();
        return cleanProfile;
    }

    // ============================================
    // MÉTODOS DE MAPA DE RUTA Y SESIONES DE TERAPIA (ROADMAP)
    // ============================================

    async getTherapyRoadmapSessions(patientId) {
        if (!patientId) return [];
        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                `SELECT * FROM therapy_roadmap_sessions 
                 WHERE patient_id = $1 
                 ORDER BY display_order ASC, session_date ASC, session_number ASC`,
                [patientId]
            );
            return res.rows.map(r => ({
                id: r.id,
                patientId: r.patient_id,
                sessionNumber: r.session_number,
                title: r.title,
                date: r.session_date ? (r.session_date.toISOString ? r.session_date.toISOString().split('T')[0] : String(r.session_date).split('T')[0]) : '',
                focusSummary: r.focus_summary || '',
                status: r.status || 'pendiente',
                clinicalNoteId: r.clinical_note_id || null,
                appointmentId: r.appointment_id || null,
                displayOrder: r.display_order ?? 0,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            }));
        }

        if (!this.localStore.therapy_roadmap_sessions) {
            this.localStore.therapy_roadmap_sessions = [];
        }
        const filtered = this.localStore.therapy_roadmap_sessions.filter(s => s.patientId === patientId || s.patient_id === patientId);
        return filtered.sort((a, b) => (a.displayOrder ?? a.display_order ?? 0) - (b.displayOrder ?? b.display_order ?? 0));
    }

    async saveTherapyRoadmapSession(sessionData) {
        if (!sessionData || !sessionData.patientId) throw new Error('patientId requerido para sesión de roadmap');
        const record = {
            id: sessionData.id || `trs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            patient_id: sessionData.patientId || sessionData.patient_id,
            patientId: sessionData.patientId || sessionData.patient_id,
            session_number: Number(sessionData.sessionNumber || sessionData.session_number || 1),
            sessionNumber: Number(sessionData.sessionNumber || sessionData.session_number || 1),
            title: sessionData.title || `Sesión #${sessionData.sessionNumber || 1}`,
            session_date: sessionData.date || sessionData.session_date || new Date().toISOString().split('T')[0],
            date: sessionData.date || sessionData.session_date || new Date().toISOString().split('T')[0],
            focus_summary: sessionData.focusSummary || sessionData.focus_summary || '',
            focusSummary: sessionData.focusSummary || sessionData.focus_summary || '',
            status: sessionData.status || 'pendiente',
            clinical_note_id: sessionData.clinicalNoteId || sessionData.clinical_note_id || null,
            clinicalNoteId: sessionData.clinicalNoteId || sessionData.clinical_note_id || null,
            appointment_id: sessionData.appointmentId || sessionData.appointment_id || null,
            appointmentId: sessionData.appointmentId || sessionData.appointment_id || null,
            display_order: Number(sessionData.displayOrder ?? sessionData.display_order ?? 0),
            displayOrder: Number(sessionData.displayOrder ?? sessionData.display_order ?? 0),
            created_at: sessionData.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (this.isPostgresConnected && this.pgPool) {
            const query = `
                INSERT INTO therapy_roadmap_sessions (
                    id, patient_id, session_number, title, session_date, focus_summary,
                    status, clinical_note_id, appointment_id, display_order, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET
                    session_number = EXCLUDED.session_number,
                    title = EXCLUDED.title,
                    session_date = EXCLUDED.session_date,
                    focus_summary = EXCLUDED.focus_summary,
                    status = EXCLUDED.status,
                    clinical_note_id = EXCLUDED.clinical_note_id,
                    appointment_id = EXCLUDED.appointment_id,
                    display_order = EXCLUDED.display_order,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const res = await this.pgPool.query(query, [
                record.id, record.patient_id, record.session_number, record.title, record.session_date,
                record.focus_summary, record.status, record.clinical_note_id, record.appointment_id,
                record.display_order, record.created_at
            ]);
            const r = res.rows[0];
            return {
                id: r.id,
                patientId: r.patient_id,
                sessionNumber: r.session_number,
                title: r.title,
                date: r.session_date ? String(r.session_date).split('T')[0] : '',
                focusSummary: r.focus_summary || '',
                status: r.status,
                clinicalNoteId: r.clinical_note_id,
                appointmentId: r.appointment_id,
                displayOrder: r.display_order,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            };
        }

        if (!this.localStore.therapy_roadmap_sessions) {
            this.localStore.therapy_roadmap_sessions = [];
        }
        const idx = this.localStore.therapy_roadmap_sessions.findIndex(s => s.id === record.id);
        if (idx >= 0) {
            this.localStore.therapy_roadmap_sessions[idx] = { ...this.localStore.therapy_roadmap_sessions[idx], ...record };
        } else {
            this.localStore.therapy_roadmap_sessions.push(record);
        }
        this._persistLocalStore();
        return record;
    }

    async updateTherapyRoadmapSession(sessionId, updates) {
        if (!sessionId) return null;
        if (this.isPostgresConnected && this.pgPool) {
            const current = await this.pgPool.query('SELECT * FROM therapy_roadmap_sessions WHERE id = $1', [sessionId]);
            if (current.rows.length === 0) return null;
            const r = current.rows[0];
            const updated = {
                session_number: updates.sessionNumber ?? updates.session_number ?? r.session_number,
                title: updates.title ?? r.title,
                session_date: updates.date ?? updates.session_date ?? r.session_date,
                focus_summary: updates.focusSummary ?? updates.focus_summary ?? r.focus_summary,
                status: updates.status ?? r.status,
                clinical_note_id: updates.clinicalNoteId !== undefined ? updates.clinicalNoteId : r.clinical_note_id,
                appointment_id: updates.appointmentId !== undefined ? updates.appointmentId : r.appointment_id,
                display_order: updates.displayOrder ?? updates.display_order ?? r.display_order
            };
            const res = await this.pgPool.query(`
                UPDATE therapy_roadmap_sessions SET
                    session_number = $1, title = $2, session_date = $3, focus_summary = $4,
                    status = $5, clinical_note_id = $6, appointment_id = $7, display_order = $8,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $9 RETURNING *
            `, [
                updated.session_number, updated.title, updated.session_date, updated.focus_summary,
                updated.status, updated.clinical_note_id, updated.appointment_id, updated.display_order, sessionId
            ]);
            const row = res.rows[0];
            return {
                id: row.id,
                patientId: row.patient_id,
                sessionNumber: row.session_number,
                title: row.title,
                date: row.session_date ? String(row.session_date).split('T')[0] : '',
                focusSummary: row.focus_summary || '',
                status: row.status,
                clinicalNoteId: row.clinical_note_id,
                appointmentId: row.appointment_id,
                displayOrder: row.display_order,
                updatedAt: row.updated_at
            };
        }

        if (!this.localStore.therapy_roadmap_sessions) this.localStore.therapy_roadmap_sessions = [];
        const idx = this.localStore.therapy_roadmap_sessions.findIndex(s => s.id === sessionId);
        if (idx === -1) return null;
        const current = this.localStore.therapy_roadmap_sessions[idx];
        const merged = {
            ...current,
            ...updates,
            sessionNumber: updates.sessionNumber ?? updates.session_number ?? current.sessionNumber,
            title: updates.title ?? current.title,
            date: updates.date ?? updates.session_date ?? current.date,
            focusSummary: updates.focusSummary ?? updates.focus_summary ?? current.focusSummary,
            status: updates.status ?? current.status,
            displayOrder: updates.displayOrder ?? updates.display_order ?? current.displayOrder,
            updatedAt: new Date().toISOString()
        };
        this.localStore.therapy_roadmap_sessions[idx] = merged;
        this._persistLocalStore();
        return merged;
    }

    async deleteTherapyRoadmapSession(sessionId, patientId) {
        if (!sessionId) return false;
        if (this.isPostgresConnected && this.pgPool) {
            const res = await this.pgPool.query(
                'DELETE FROM therapy_roadmap_sessions WHERE id = $1 AND ($2::VARCHAR IS NULL OR patient_id = $2) RETURNING id',
                [sessionId, patientId || null]
            );
            return (res.rowCount || 0) > 0;
        }

        if (!this.localStore.therapy_roadmap_sessions) return false;
        const initLen = this.localStore.therapy_roadmap_sessions.length;
        this.localStore.therapy_roadmap_sessions = this.localStore.therapy_roadmap_sessions.filter(
            s => !(s.id === sessionId && (!patientId || s.patientId === patientId || s.patient_id === patientId))
        );
        const changed = this.localStore.therapy_roadmap_sessions.length !== initLen;
        if (changed) this._persistLocalStore();
        return changed;
    }

    async reorderTherapyRoadmapSessions(patientId, orderedIds) {
        if (!patientId || !Array.isArray(orderedIds)) return false;
        if (this.isPostgresConnected && this.pgPool) {
            for (let i = 0; i < orderedIds.length; i++) {
                await this.pgPool.query(
                    'UPDATE therapy_roadmap_sessions SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND patient_id = $3',
                    [i + 1, orderedIds[i], patientId]
                );
            }
            return true;
        }

        if (!this.localStore.therapy_roadmap_sessions) return false;
        orderedIds.forEach((id, idx) => {
            const item = this.localStore.therapy_roadmap_sessions.find(s => s.id === id && (s.patientId === patientId || s.patient_id === patientId));
            if (item) {
                item.displayOrder = idx + 1;
                item.display_order = idx + 1;
            }
        });
        this._persistLocalStore();
        return true;
    }
}

export const db = new DatabaseManager();
