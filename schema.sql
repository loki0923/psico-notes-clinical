-- ============================================
-- PSICO NOTES CLINICAL v6.0 - POSTGRESQL PRODUCTION SCHEMA
-- Base de Datos Relacional para Despliegues Dedicados y Contenedores Docker
-- ============================================

-- 1. Tabla de Terapeutas / Profesionales
CREATE TABLE IF NOT EXISTS therapists (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) DEFAULT 'Psicología Clínica',
    registry_number VARCHAR(100) DEFAULT '',
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50) DEFAULT '',
    institution VARCHAR(255) DEFAULT '',
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Pacientes / Expedientes Clínicos
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(64) PRIMARY KEY,
    therapist_id VARCHAR(64) REFERENCES therapists(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    birthdate DATE,
    life_stage VARCHAR(30) DEFAULT 'adult' CHECK (life_stage IN ('child', 'adolescent', 'adult')),
    occupation VARCHAR(255),
    civil_status VARCHAR(50),
    address TEXT,
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(50),
    guardian_relation VARCHAR(100),
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    diagnosis TEXT,
    clinical_stage VARCHAR(50) DEFAULT 'evaluacion',
    portal_token VARCHAR(32) UNIQUE,
    portal_enabled BOOLEAN DEFAULT TRUE,
    portal_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    protective_factors TEXT,
    risk_factors TEXT,
    preconsulta_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_portal_token ON patients(portal_token);
CREATE INDEX IF NOT EXISTS idx_patients_therapist_id ON patients(therapist_id);

-- 3. Tareas Intersesión del Paciente
CREATE TABLE IF NOT EXISTS patient_tasks (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline DATE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_patient_id ON patient_tasks(patient_id);

-- 4. Autoregistro de Pensamientos Automáticos (Modelo ABC de Beck)
CREATE TABLE IF NOT EXISTS cbt_records (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    situation TEXT NOT NULL,
    thought TEXT NOT NULL,
    distortion VARCHAR(150),
    emotion VARCHAR(100) NOT NULL,
    initial_intensity INTEGER CHECK (initial_intensity BETWEEN 0 AND 100),
    rational_thought TEXT NOT NULL,
    final_intensity INTEGER CHECK (final_intensity BETWEEN 0 AND 100),
    behavioral_reaction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cbt_patient_id ON cbt_records(patient_id);

-- 5. Monitoreo Diario de Estado de Ánimo y Bienestar
CREATE TABLE IF NOT EXISTS mood_logs (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
    sleep_score INTEGER CHECK (sleep_score BETWEEN 1 AND 5),
    energy_score INTEGER CHECK (energy_score BETWEEN 1 AND 5),
    note TEXT,
    word VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mood_patient_id ON mood_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_mood_created_at ON mood_logs(created_at DESC);

-- 6. Evaluaciones Psicométricas (PHQ-9, GAD-7, etc.)
CREATE TABLE IF NOT EXISTS evaluations (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    scale_type VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    severity VARCHAR(50),
    action_plan TEXT,
    answers JSONB NOT NULL DEFAULT '[]',
    alert_risk BOOLEAN DEFAULT FALSE,
    risk_reason TEXT,
    source VARCHAR(20) DEFAULT 'portal' CHECK (source IN ('portal', 'clinical_app')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eval_patient_id ON evaluations(patient_id);
CREATE INDEX IF NOT EXISTS idx_eval_risk ON evaluations(alert_risk);

-- 7. Alertas de Crisis y Protocolo SOS en Tiempo Real
CREATE TABLE IF NOT EXISTS crisis_alerts (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    severity VARCHAR(30) DEFAULT 'ALTO',
    reason TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crisis_patient ON crisis_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_crisis_pending ON crisis_alerts(acknowledged);

-- 8. Sesiones y Notas Clínicas de Evolución (Dual SOAP / FPV)
CREATE TABLE IF NOT EXISTS clinical_notes (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    session_number INTEGER DEFAULT 1,
    note_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    session_goals TEXT,
    applied_techniques TEXT,
    session_description TEXT,
    clinical_findings TEXT,
    obtained_results TEXT,
    next_sessions_plan TEXT,
    risk_level VARCHAR(30) DEFAULT 'bajo',
    confidential BOOLEAN DEFAULT FALSE,
    scale_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_patient ON clinical_notes(patient_id);

-- 9. Citas y Agenda Terapéutica
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration INTEGER DEFAULT 50,
    status VARCHAR(30) DEFAULT 'programada',
    attendance_confirmed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_date ON appointments(appointment_date);

-- 10. Sincronización en la Nube Multi-Dispositivo (Snapshot Clínico Integral por Terapeuta)
CREATE TABLE IF NOT EXISTS therapist_cloud_sync (
    therapist_id VARCHAR(64) PRIMARY KEY,
    payload JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    client_timestamp BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_updated_at ON therapist_cloud_sync(updated_at);

-- 11. Restablecimiento y Recuperación Segura de Contraseñas
CREATE TABLE IF NOT EXISTS password_resets (
    email VARCHAR(255) PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Registro de Auditoría de Seguridad Clínica (Audit Trail - SEC-006)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    therapist_id VARCHAR(64),
    patient_id VARCHAR(64),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    user_agent VARCHAR(255) DEFAULT '',
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_therapist ON audit_logs(therapist_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- 13. Configuración Fiscal SENIAT Persistente (DB-002)
CREATE TABLE IF NOT EXISTS billing_config (
    therapist_id VARCHAR(64) PRIMARY KEY REFERENCES therapists(id) ON DELETE CASCADE,
    fiscal_name VARCHAR(255) NOT NULL,
    rif VARCHAR(50) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    invoice_prefix VARCHAR(20) DEFAULT 'FACT-',
    next_number INTEGER DEFAULT 1,
    iva_rate NUMERIC DEFAULT 0,
    apply_igtf BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Facturación Emitida SENIAT Persistente (DB-002)
CREATE TABLE IF NOT EXISTS billing_invoices (
    id VARCHAR(64) PRIMARY KEY,
    therapist_id VARCHAR(64) REFERENCES therapists(id) ON DELETE CASCADE,
    patient_id VARCHAR(64) REFERENCES patients(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_rif VARCHAR(50),
    subtotal NUMERIC NOT NULL,
    iva_amount NUMERIC DEFAULT 0,
    igtf_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(30) DEFAULT 'emitida',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_therapist ON billing_invoices(therapist_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON billing_invoices(patient_id);

-- 15. Actividades y Entradas Lúdicas del Portal KID (Psico Kids Space)
CREATE TABLE IF NOT EXISTS kid_portal_activities (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'avatar', 'weather_mood', 'bubble_pop', 'drawing', 'secret_chest'
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kid_act_patient ON kid_portal_activities(patient_id);
CREATE INDEX IF NOT EXISTS idx_kid_act_type ON kid_portal_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_kid_act_created ON kid_portal_activities(created_at DESC);

-- 16. Perfiles de Estilo y Preferencias de Redacción Clínica (HeyFreud Benchmark)
CREATE TABLE IF NOT EXISTS therapist_style_profiles (
    therapist_id VARCHAR(64) PRIMARY KEY REFERENCES therapists(id) ON DELETE CASCADE,
    profile JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Sesiones de Terapia y Mapa de Ruta Longitudinal (Roadmap)
CREATE TABLE IF NOT EXISTS therapy_roadmap_sessions (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    session_date DATE NOT NULL,
    focus_summary TEXT DEFAULT '',
    status VARCHAR(30) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'completada', 'agendada', 'reprogramada', 'cancelada')),
    clinical_note_id VARCHAR(64) REFERENCES clinical_notes(id) ON DELETE SET NULL,
    appointment_id VARCHAR(64) REFERENCES appointments(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roadmap_patient ON therapy_roadmap_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_order ON therapy_roadmap_sessions(patient_id, display_order ASC);

-- 18. Documentos Compartidos en Portal (Word, PDF, Imágenes)
CREATE TABLE IF NOT EXISTS patient_documents (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id VARCHAR(64) REFERENCES therapists(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER DEFAULT 0,
    file_data TEXT,
    uploaded_by VARCHAR(30) DEFAULT 'patient',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_docs_patient ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_docs_created ON patient_documents(created_at DESC);

-- 19. Reportes de Pago y Comprobantes del Paciente
CREATE TABLE IF NOT EXISTS patient_payment_reports (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id VARCHAR(64) REFERENCES therapists(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    reference VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL,
    concept VARCHAR(255) DEFAULT 'Sesión de psicoterapia',
    receipt_data TEXT,
    status VARCHAR(30) DEFAULT 'pendiente',
    therapist_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_patient ON patient_payment_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON patient_payment_reports(created_at DESC);

-- 20. Configuración de Formas de Pago Personalizadas por Terapeuta para el Portal
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]';


