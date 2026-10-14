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
