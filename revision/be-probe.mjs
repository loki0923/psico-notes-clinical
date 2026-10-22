/**
 * BE-01 · Sonda de pruebas en vivo para Psico Notes Clinical v6.0
 * Uso:  node revision/be-probe.mjs            (contra http://127.0.0.1:4210)
 *       PROBE_BASE=http://127.0.0.1:4173 node revision/be-probe.mjs --readonly
 *
 * Solo LEE y crea registros propios con IDs/emails únicos (probe_<ts>).
 * Guarda evidencia cruda en revision/be-probe-results.json
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PROBE_BASE || 'http://127.0.0.1:4210';
const READONLY = process.argv.includes('--readonly');
const TS = Date.now();
const results = [];
const DEFAULT_SECRET = 'psico-clinical-hmac-sha256-secret-key-prod-v6-2026';

function b64url(buf) { return Buffer.from(buf).toString('base64url'); }
function forgeToken(payload, secret = DEFAULT_SECRET) {
    const p = b64url(JSON.stringify(payload));
    const sig = crypto.createHmac('sha256', secret).update(p).digest('base64url');
    return `${p}.${sig}`;
}

async function req(id, method, urlPath, opts = {}) {
    const { headers = {}, body, raw, expectNote = '' } = opts;
    const h = { ...headers };
    let payload;
    if (raw !== undefined) { payload = raw; }
    else if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = h['Content-Type'] || 'application/json'; }
    const t0 = Date.now();
    let out = { id, method, path: urlPath, note: expectNote, requestBody: body === undefined ? undefined : (JSON.stringify(body).length > 400 ? `<${JSON.stringify(body).length} bytes>` : body) };
    try {
        const res = await fetch(BASE + urlPath, { method, headers: h, body: payload });
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch { }
        out = {
            ...out,
            status: res.status,
            contentType: res.headers.get('content-type'),
            ms: Date.now() - t0,
            bodyText: text.length > 1200 ? text.slice(0, 1200) + `…[${text.length} bytes]` : text,
            json
        };
    } catch (e) {
        out = { ...out, error: e.message, ms: Date.now() - t0 };
    }
    results.push(out);
    const st = out.error ? `ERR ${out.error}` : out.status;
    console.log(`[${String(st).padEnd(5)}] ${method.padEnd(4)} ${urlPath}  ${expectNote}`);
    return out;
}

const H = (token, extra = {}) => ({ Authorization: `Bearer ${token}`, ...extra });

// ============================== 1. SALUD ==============================
await req('health', 'GET', '/api/health', { expectNote: 'salud' });

// ============================== 2. AUTH ==============================
const emailA = `probe_be01_a_${TS}@clinic.test`;
const passA = 'hash_de_prueba_A_123';
const emailB = `probe_be01_b_${TS}@clinic.test`;
const passB = 'hash_de_prueba_B_456';

const regA = await req('reg_A', 'POST', '/api/v1/auth/register', {
    body: { id: `probe_therapist_a_${TS}`, name: 'Terapeuta Probe A', email: emailA, passwordHash: passA, specialty: 'Psicología Clínica', registryNumber: 'MPPS-0001' },
    expectNote: 'registro nuevo'
});
const tokenA = regA.json?.sessionToken;
const idA = regA.json?.therapist?.id;

const regB = await req('reg_B', 'POST', '/api/v1/auth/register', {
    body: { id: `probe_therapist_b_${TS}`, name: 'Terapeuta Probe B', email: emailB, passwordHash: passB, specialty: 'Psicología Clínica' },
    expectNote: 'registro nuevo (2º terapeuta)'
});
const tokenB = regB.json?.sessionToken;
const idB = regB.json?.therapist?.id;

await req('reg_dup', 'POST', '/api/v1/auth/register', { body: { name: 'A', email: emailA, passwordHash: 'otro_hash' }, expectNote: 'email ya existe + pass distinta (esperado 409)' });

const loginOk = await req('login_ok', 'POST', '/api/v1/auth/login', { body: { email: emailA, passwordHash: passA }, expectNote: 'login correcto', headers: { 'X-Forwarded-For': '10.10.1.1' } });
await req('login_bad', 'POST', '/api/v1/auth/login', { body: { email: emailA, passwordHash: 'clave_incorrecta' }, expectNote: 'login incorrecto (esperado 401)', headers: { 'X-Forwarded-For': '10.10.1.2' } });
await req('login_nouser', 'POST', '/api/v1/auth/login', { body: { email: `nadie_${TS}@clinic.test`, passwordHash: 'x' }, expectNote: 'usuario inexistente (esperado 401)', headers: { 'X-Forwarded-For': '10.10.1.3' } });
await req('login_nopass', 'POST', '/api/v1/auth/login', { body: { email: emailA, passwordHash: '' }, expectNote: 'passwordHash vacío (esperado 400)', headers: { 'X-Forwarded-For': '10.10.1.4' } });

// ¿login acepta cuenta con password_hash vacío? (no testeable sin fila vacía) — omitido.

// Token: sin token / basura / manipulado / expirado / forjado con secreto por defecto
await req('auth_none', 'GET', '/api/v1/patients', { expectNote: 'sin token (esperado 401)' });
await req('auth_garbage', 'GET', '/api/v1/patients', { headers: H('basura.token'), expectNote: 'token basura (esperado 401)' });
const tampered = tokenA ? tokenA.slice(0, -3) + 'AAA' : 'x.y';
await req('auth_tampered', 'GET', '/api/v1/patients', { headers: H(tampered), expectNote: 'token con firma alterada (esperado 401)' });
const expired = forgeToken({ therapistId: idA, email: emailA, iat: Date.now() - 100, exp: Date.now() - 5000 });
await req('auth_expired', 'GET', '/api/v1/patients', { headers: H(expired), expectNote: 'token expirado firmado con secreto por defecto (esperado 401)' });
const forged = forgeToken({ therapistId: idA, email: emailA, iat: Date.now(), exp: Date.now() + 3600000 });
await req('auth_forged_default_secret', 'GET', '/api/v1/patients', { headers: H(forged), expectNote: 'TOKEN FORJADO con secreto hardcodeado' });
const noExp = forgeToken({ therapistId: idA, email: emailA });
await req('auth_no_exp', 'GET', '/api/v1/patients', { headers: H(noExp), expectNote: 'token sin claim exp' });

// Spoofing de identidad declarada
await req('spoof_header', 'GET', '/api/v1/patients', { headers: H(tokenA, { 'X-Therapist-Id': idB }), expectNote: 'X-Therapist-Id ajeno (esperado 403)' });
await req('spoof_body', 'POST', '/api/v1/patients/sync', { headers: H(tokenA), body: { therapistId: idB, patients: [] }, expectNote: 'therapistId ajeno en body (esperado 403)' });
await req('spoof_query', 'GET', `/api/v1/clinical/sync?therapistId=${encodeURIComponent(idB)}`, { headers: H(tokenA), expectNote: 'therapistId ajeno en query (esperado 403)' });

// Reconnect sin contraseña (solo id) + fuga de password_hash
const reconnect = await req('register_reconnect_spoof', 'POST', '/api/v1/auth/register', {
    body: { id: idA, name: 'A', email: emailA, passwordHash: 'clave_que_no_es_la_correcta' },
    expectNote: 'registro con email existente + id correcto + pass incorrecta'
});

// ============================== 3. PACIENTES / TENANT ==============================
const patAId = `probe_pat_a_${TS}`;
const portalTokenA = `PN-PROBE${String(TS).slice(-6)}`;
await req('patients_sync_A', 'POST', '/api/v1/patients/sync', {
    headers: H(tokenA),
    body: {
        patients: [{ id: patAId, name: 'Paciente Probe A', email: 'probe.pat.a@test', phone: '+58 400 0000000', birthdate: '1990-05-05', lifeStage: 'adult', diagnosis: 'Trastorno de Ansiedad Generalizada', portalToken: portalTokenA, portalEnabled: true }],
        tasks: [{ id: `probe_task_${TS}`, patient_id: patAId, title: 'Registro de pensamientos', description: 'Diario ABC', completed: false }]
    },
    expectNote: 'sync paciente+1 tarea'
});
const patsA = await req('patients_list_A', 'GET', '/api/v1/patients', { headers: H(tokenA), expectNote: 'listado pacientes A' });
const visiblesA = Array.isArray(patsA.json?.patients) ? patsA.json.patients.length : -1;
const ajenosA = Array.isArray(patsA.json?.patients) ? patsA.json.patients.filter(p => p.therapist_id !== idA).length : -1;

const patsB = await req('patients_list_B', 'GET', '/api/v1/patients', { headers: H(tokenB), expectNote: 'listado pacientes B (no debe ver los de A)' });
const veDeA = Array.isArray(patsB.json?.patients) ? patsB.json.patients.some(p => p.id === patAId) : -1;

await req('portal_data_own', 'GET', `/api/v1/portal/data/${patAId}`, { headers: H(tokenA), expectNote: 'expediente propio (esperado 200)' });
await req('portal_data_other_tenant', 'GET', `/api/v1/portal/data/${patAId}`, { headers: H(tokenB), expectNote: 'expediente de A leído por B (esperado 403)' });
await req('portal_data_null_tenant', 'GET', '/api/v1/portal/data/test_p_1791944905861', { headers: H(tokenB), expectNote: 'expediente con therapist_id NULL leído por B (IDOR)' });

// ============================== 4. PORTAL PACIENTE ==============================
await req('portal_auth_bad', 'POST', '/api/v1/portal/auth', { body: { token: 'PN-NOEXISTE' }, headers: { 'X-Forwarded-For': '10.10.2.1' }, expectNote: 'código inválido (esperado 401)' });
await req('portal_auth_empty', 'POST', '/api/v1/portal/auth', { body: {}, headers: { 'X-Forwarded-For': '10.10.2.2' }, expectNote: 'sin código (esperado 400)' });
const pauth = await req('portal_auth_ok', 'POST', '/api/v1/portal/auth', { body: { token: portalTokenA }, headers: { 'X-Forwarded-For': '10.10.2.3' }, expectNote: 'código válido' });
await req('portal_me', 'GET', `/api/v1/portal/me?token=${encodeURIComponent(portalTokenA)}`, { expectNote: 'datos del portal' });
await req('portal_me_notoken', 'GET', '/api/v1/portal/me', { expectNote: 'sin token (esperado 401)' });
await req('portal_mood', 'POST', '/api/v1/portal/mood', { body: { patientId: patAId, token: portalTokenA, mood: 4, sleep: 3, energy: 4, note: 'probe' }, expectNote: 'ánimo' });
await req('portal_mood_badvals', 'POST', '/api/v1/portal/mood', { body: { patientId: patAId, token: portalTokenA, mood: 99, sleep: -3, energy: 'x' }, expectNote: 'valores fuera de rango 1..5 (schema CHECK)' });
await req('portal_mood_idor', 'POST', '/api/v1/portal/mood', { body: { patientId: 'test_p_1791944905861', token: portalTokenA, mood: 3 }, expectNote: 'token de A escribiendo en otro paciente (esperado 403)' });
await req('portal_cbt', 'POST', '/api/v1/portal/cbt', { body: { patientId: patAId, token: portalTokenA, situation: 's', thought: 't', distortion: 'catastrofización', emotion: 'ansiedad', initialIntensity: 80, rationalThought: 'r', finalIntensity: 40 }, expectNote: 'autoregistro ABC' });
await req('portal_eval', 'POST', '/api/v1/portal/evaluations', { body: { patientId: patAId, token: portalTokenA, scaleType: 'phq9', score: 18, maxScore: 27, severity: 'Moderadamente severa', answers: [1, 2, 3], alertRisk: true, riskReason: 'Ítem 9' }, expectNote: 'evaluación + alerta de riesgo' });
await req('portal_task_toggle', 'POST', `/api/v1/portal/tasks/probe_task_${TS}/toggle`, { body: { patientId: patAId, token: portalTokenA }, expectNote: 'toggle tarea existente' });
await req('portal_task_toggle_404', 'POST', '/api/v1/portal/tasks/no_existe/toggle', { body: { patientId: patAId, token: portalTokenA }, expectNote: 'tarea inexistente (esperado 404)' });
await req('portal_task_toggle_notoken', 'POST', '/api/v1/portal/tasks/probe_task_' + TS + '/toggle', { body: { patientId: patAId }, expectNote: 'toggle sin token (esperado 401/403)' });
await req('portal_crisis', 'POST', '/api/v1/portal/crisis', { body: { patientId: patAId, token: portalTokenA, reason: 'probe SOS', severity: 'ALTO' }, expectNote: 'botón SOS' });
await req('portal_crisis_idor', 'POST', '/api/v1/portal/crisis', { body: { patientId: 'test_p_1791944905861', token: portalTokenA }, expectNote: 'SOS sobre paciente ajeno (esperado 403)' });
await req('portal_eval_notoken', 'POST', '/api/v1/portal/evaluations', { body: { patientId: patAId, scaleType: 'phq9', score: 5 }, expectNote: 'evaluación sin token (esperado 401)' });

// ============================== 5. ALERTAS DE CRISIS (TERAPEUTA) ==============================
await req('alerts_noauth', 'GET', '/api/v1/portal/crisis-alerts', { expectNote: 'sin auth (esperado 401)' });
const alertsA = await req('alerts_A', 'GET', '/api/v1/portal/crisis-alerts', { headers: H(tokenA), expectNote: 'alertas de A' });
const miAlerta = Array.isArray(alertsA.json?.alerts) ? alertsA.json.alerts.find(a => a.patient_id === patAId) : null;
if (miAlerta) {
    await req('ack_other', 'POST', `/api/v1/portal/crisis-alerts/ack/${miAlerta.id}`, { headers: H(tokenB), expectNote: 'B reconoce alerta de A (esperado 403)' });
    await req('ack_own', 'POST', `/api/v1/portal/crisis-alerts/ack/${miAlerta.id}`, { headers: H(tokenA), expectNote: 'A reconoce su alerta' });
}
await req('ack_404', 'POST', '/api/v1/portal/crisis-alerts/ack/no_existe', { headers: H(tokenA), expectNote: 'alerta inexistente (esperado 404)' });

// ============================== 6. IA / TELEHEALTH / SYNC ==============================
await req('soap_nokey', 'POST', '/api/v1/clinical/soap-synthesize', { headers: H(tokenA), body: { notes: 'Paciente refiere insomnio y llanto fácil desde hace 3 semanas. Ideación autolítica niega.' }, expectNote: 'sin GEMINI_API_KEY — ¿contenido inventado con 200?' });
await req('soap_nonotes', 'POST', '/api/v1/clinical/soap-synthesize', { headers: H(tokenA), body: {}, expectNote: 'sin notes (esperado 400)' });
await req('soap_noauth', 'POST', '/api/v1/clinical/soap-synthesize', { body: { notes: 'x' }, expectNote: 'sin auth (esperado 401)' });

await req('tele_noauth', 'POST', '/api/v1/telehealth/session', { body: {}, expectNote: 'sin auth (esperado 401)' });
const teleA = await req('tele_therapist', 'POST', '/api/v1/telehealth/session', { headers: H(tokenA), body: { patientId: patAId }, expectNote: 'sala como terapeuta' });
const teleP = await req('tele_patient', 'POST', '/api/v1/telehealth/session', { body: { patientToken: portalTokenA, patientId: patAId }, expectNote: 'sala como paciente' });
await req('tele_patient_any_id', 'POST', '/api/v1/telehealth/session', { body: { patientToken: portalTokenA, patientId: 'test_p_1791944905861' }, expectNote: 'token de A abre sala para paciente ajeno' });

const userId = idA;
await req('sync_push_ok', 'POST', '/api/v1/sync/push', { headers: H(tokenA), body: { userId, encryptedData: 'blob_cifrado_de_prueba', timestamp: Date.now() }, expectNote: 'push' });
await req('sync_push_other', 'POST', '/api/v1/sync/push', { headers: H(tokenA), body: { userId: idB, encryptedData: 'x' }, expectNote: 'push al buzón de B (esperado 403)' });
await req('sync_pull_ok', 'GET', `/api/v1/sync/pull/${encodeURIComponent(userId)}`, { headers: H(tokenA), expectNote: 'pull propio' });
await req('sync_pull_other', 'GET', `/api/v1/sync/pull/${encodeURIComponent(idB)}`, { headers: H(tokenA), expectNote: 'pull de B (esperado 403)' });
await req('sync_pull_empty', 'GET', `/api/v1/sync/pull/probe_vacio_${TS}`, { headers: H(tokenA), expectNote: 'pull sin datos (esperado 404)' });
const bigBlob = 'A'.repeat(5 * 1024 * 1024 + 100);
await req('sync_push_big', 'POST', '/api/v1/sync/push', { headers: H(tokenA), body: { userId, encryptedData: bigBlob }, expectNote: 'push 5MB+ (esperado 413)' });

// ============================== 7. SYNC CLÍNICO ==============================
await req('clinical_sync_get_empty', 'GET', '/api/v1/clinical/sync', { headers: H(tokenB), expectNote: 'sin datos previos (esperado status empty)' });
const cs = await req('clinical_sync_post', 'POST', '/api/v1/clinical/sync', {
    headers: H(tokenA),
    body: { therapistId: idA, clientTimestamp: Date.now(), payload: { patients: [{ id: `probe_pat_cs_${TS}`, name: 'Paciente CS', lifeStage: 'adult' }], notes: [{ id: 'n1', patientId: `probe_pat_cs_${TS}`, intersessionTasks: [{ id: `probe_task_cs_${TS}`, patient_id: `probe_pat_cs_${TS}`, title: 'Tarea CS' }] }], appointments: [], settings: {} } },
    expectNote: 'push payload clínico'
});
await req('clinical_sync_get_after', 'GET', '/api/v1/clinical/sync', { headers: H(tokenA), expectNote: 'lectura posterior' });
await req('clinical_sync_nopayload', 'POST', '/api/v1/clinical/sync', { headers: H(tokenA), body: {}, expectNote: 'sin payload (esperado 400)' });
await req('clinical_sync_noid', 'POST', '/api/v1/clinical/sync', { headers: H(tokenB), body: { payload: { patients: [{ id: 'x' }] } }, expectNote: 'payload sin therapistId' });

// ============================== 8. FACTURACIÓN / AUDITORÍA ==============================
await req('billing_cfg_get', 'GET', '/api/v1/billing/config', { headers: H(tokenA), expectNote: 'config inexistente (esperado null/404)' });
await req('billing_cfg_post', 'POST', '/api/v1/billing/config', { headers: H(tokenA), body: { config: { fiscalName: 'Probe A', rif: 'V-12345678', address: 'Caracas', phone: '0212', invoicePrefix: 'FACT-', nextNumber: 1, ivaRate: 16, applyIGTF: true } }, expectNote: 'guardar config' });
await req('billing_cfg_get2', 'GET', '/api/v1/billing/config', { headers: H(tokenA), expectNote: 'leer config guardada' });
await req('billing_inv_post', 'POST', '/api/v1/billing/invoices', { headers: H(tokenA), body: { invoice: { id: `probe_inv_${TS}`, patientId: patAId, number: `FACT-${TS}`, date: '2026-10-21', patientName: 'Paciente Probe A', amountUSD: 100, ivaAmount: 16, igtfUSD: 3, totalUSD: 119 } }, expectNote: 'emitir factura' });
const invs = await req('billing_inv_get', 'GET', '/api/v1/billing/invoices', { headers: H(tokenA), expectNote: 'listar facturas' });
await req('audit_logs', 'GET', '/api/v1/audit/logs', { headers: H(tokenA), expectNote: 'bitácora' });
await req('audit_logs_noauth', 'GET', '/api/v1/audit/logs', { expectNote: 'bitácora sin auth (esperado 401)' });

// ============================== 9. CORS ==============================
await req('cors_same_origin_4173', 'POST', '/api/v1/auth/login', { headers: { Origin: 'http://127.0.0.1:4173' }, body: { email: emailA, passwordHash: passA }, expectNote: 'Origin del propio server 4173' });
await req('cors_lan_origin', 'POST', '/api/v1/auth/login', { headers: { Origin: 'http://192.168.1.50:4173' }, body: { email: emailA, passwordHash: passA }, expectNote: 'Origin LAN' });
await req('cors_evil', 'GET', '/api/health', { headers: { Origin: 'https://evil.example' }, expectNote: 'Origin no autorizado (esperado 403)' });
await req('cors_allowed_localhost3000', 'GET', '/api/health', { headers: { Origin: 'http://localhost:3000' }, expectNote: 'Origin whitelisted' });
await req('cors_preflight', 'OPTIONS', '/api/v1/auth/login', { headers: { Origin: 'http://127.0.0.1:4173', 'Access-Control-Request-Method': 'POST' }, expectNote: 'preflight desde 4173' });
await req('cors_null_origin', 'GET', '/api/v1/patients', { headers: H(tokenA, { Origin: 'null' }), expectNote: "Origin: null (file://)" });

// ============================== 10. RATE LIMIT ==============================
const rl = [];
for (let i = 1; i <= 7; i++) {
    const r = await req(`rl_success_${i}`, 'POST', '/api/v1/auth/login', { headers: { 'X-Forwarded-For': '10.20.30.40' }, body: { email: emailA, passwordHash: passA }, expectNote: `login VÁLIDO #${i} (mismo IP)` });
    rl.push(r.status);
}
const spoof = [];
for (let i = 1; i <= 6; i++) {
    const r = await req(`rl_spoof_${i}`, 'POST', '/api/v1/auth/login', { headers: { 'X-Forwarded-For': `10.20.30.${60 + i}` }, body: { email: emailA, passwordHash: 'mal' }, expectNote: `intento fallido con IP falsificada #${i}` });
    spoof.push(r.status);
}
const portalRl = [];
for (let i = 1; i <= 7; i++) {
    const r = await req(`rl_portal_${i}`, 'POST', '/api/v1/portal/auth', { headers: { 'X-Forwarded-For': '10.99.99.99' }, body: { token: 'PN-INVALIDO' }, expectNote: `portal auth inválido #${i}` });
    portalRl.push(r.status);
}

// ============================== 11. ROBUSTEZ ==============================
await req('bad_json', 'POST', '/api/v1/auth/login', { raw: '{"email": "a", ', headers: { 'Content-Type': 'application/json' }, expectNote: 'JSON malformado (esperado 400 JSON)' });
await req('wrong_method', 'GET', '/api/v1/patients/sync', { headers: H(tokenA), expectNote: 'método incorrecto (esperado 405/404 JSON)' });
await req('not_found_api', 'GET', '/api/v1/inexistente', { expectNote: '404 API' });
await req('spa_route', 'GET', '/portal', { expectNote: 'ruta amigable /portal' });
await req('no_body_post', 'POST', '/api/v1/billing/invoices', { headers: H(tokenA), expectNote: 'POST sin body' });
await req('array_body', 'POST', '/api/v1/auth/login', { headers: { 'Content-Type': 'application/json' }, body: [1, 2, 3], expectNote: 'body array en login' });
await req('huge_json', 'POST', '/api/v1/clinical/sync', { raw: '{"payload":"' + 'x'.repeat(11 * 1024 * 1024) + '"}', headers: { 'Content-Type': 'application/json', ...H(tokenA) }, expectNote: 'body 11MB (esperado 413)' });
await req('static_data_json', 'GET', '/data/psiconotes_relational.json', { expectNote: 'almacén clínico por HTTP estático' });
await req('static_revision_json', 'GET', '/revision/be-probe-results.json', { expectNote: 'resultados de auditoría expuestos' });
await req('static_server_js', 'GET', '/server.js', { expectNote: 'código fuente (esperado 403)' });
await req('static_schema', 'GET', '/schema.sql', { expectNote: 'esquema (esperado 403)' });
await req('static_app_js', 'GET', '/app.js', { expectNote: 'fuente frontend' });
await req('health_leak', 'GET', '/api/health', { expectNote: 'health declara features' });

// ============================== RESUMEN ==============================
const summary = {
    base: BASE,
    readonly: READONLY,
    ts: TS,
    ids: { idA, idB, patAId, portalTokenA, emailA, emailB },
    checks: {
        pacientes_visibles_A: visiblesA,
        pacientes_de_otros_en_lista_A: ajenosA,
        B_ve_paciente_de_A: veDeA,
        reconnect_sin_password_status: reconnect.status,
        reconnect_filtra_password_hash: JSON.stringify(reconnect.json || {}).includes('password_hash'),
        soap_sin_key_status: results.find(r => r.id === 'soap_nokey')?.status,
        soap_sin_key_inventa_contenido: Boolean(results.find(r => r.id === 'soap_nokey')?.json?.subjetivo),
        rate_limit_logins_validos: rl,
        rate_limit_spoof: spoof,
        rate_limit_portal: portalRl,
        health_database: results.find(r => r.id === 'health')?.json?.database,
        cors_4173: results.find(r => r.id === 'cors_same_origin_4173')?.status,
        static_data_json: results.find(r => r.id === 'static_data_json')?.status,
        tamano_data_json: results.find(r => r.id === 'static_data_json')?.bodyText?.length
    },
    results
};
fs.writeFileSync(path.join(__dirname, 'be-probe-results.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log('\n=== RESUMEN ===');
console.log(JSON.stringify(summary.checks, null, 2));
console.log('Evidencia: revision/be-probe-results.json');
