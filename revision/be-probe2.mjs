/**
 * BE-01 · Sonda complementaria (robustez de tipos, semántica, fugas).
 * node revision/be-probe2.mjs   (contra http://127.0.0.1:4210)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PROBE_BASE || 'http://127.0.0.1:4210';
const prev = JSON.parse(fs.readFileSync(path.join(__dirname, 'be-probe-results.json'), 'utf8'));
const { idA, idB, tokenA, tokenB, portalTokenA, patAId } = prev.ids.tokens ? prev.ids : { ...prev.ids, tokenA: null, tokenB: null };
const T = prev.ids;
const results = [];

async function req(id, method, urlPath, opts = {}) {
    const { headers = {}, body, raw, note = '' } = opts;
    const h = { ...headers };
    let payload;
    if (raw !== undefined) payload = raw;
    else if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = h['Content-Type'] || 'application/json'; }
    let out = { id, method, path: urlPath, note };
    try {
        const res = await fetch(BASE + urlPath, { method, headers: h, body: payload });
        const text = await res.text();
        let json = null; try { json = JSON.parse(text); } catch { }
        out = { ...out, status: res.status, contentType: res.headers.get('content-type'), bodyText: text.slice(0, 900), json };
    } catch (e) { out = { ...out, error: e.message }; }
    results.push(out);
    console.log(`[${String(out.error || out.status).padEnd(5)}] ${method.padEnd(4)} ${urlPath} :: ${String(out.json ? JSON.stringify(out.json) : out.bodyText).slice(0, 200)}`);
    return out;
}
const H = (t, extra = {}) => ({ Authorization: `Bearer ${t}`, ...extra });

// tokens del probe 1 (no se guardaron): reconstruir vía login
const loginA = await req('login_A', 'POST', '/api/v1/auth/login', { headers: { 'X-Forwarded-For': '10.77.0.1' }, body: { email: T.emailA, passwordHash: 'hash_de_prueba_A_123' } });
const loginB = await req('login_B', 'POST', '/api/v1/auth/login', { headers: { 'X-Forwarded-For': '10.77.0.2' }, body: { email: T.emailB, passwordHash: 'hash_de_prueba_B_456' } });
const tA = loginA.json?.sessionToken, tB = loginB.json?.sessionToken, iA = loginA.json?.therapist?.id, iB = loginB.json?.therapist?.id;

// 1. pull de usuario propio sin datos
await req('pull_own_empty', 'GET', `/api/v1/sync/pull/${encodeURIComponent(iB)}`, { headers: H(tB), note: 'pull propio sin datos (esperado 404)' });

// 2. tipos erróneos en body (deberían ser 400, no 500)
await req('sync_patients_string', 'POST', '/api/v1/patients/sync', { headers: H(tA), body: { patients: 'no_es_array' }, note: 'patients:string' });
await req('sync_tasks_string', 'POST', '/api/v1/patients/sync', { headers: H(tA), body: { patients: [], tasks: 'no_es_array' }, note: 'tasks:string' });
await req('login_email_object', 'POST', '/api/v1/auth/login', { headers: { 'X-Forwarded-For': '10.77.0.3' }, body: { email: { a: 1 }, passwordHash: 'x' }, note: 'email:objeto' });
await req('portal_auth_number', 'POST', '/api/v1/portal/auth', { headers: { 'X-Forwarded-For': '10.77.0.4' }, body: { token: 12345 }, note: 'token:number' });
await req('soap_notes_object', 'POST', '/api/v1/clinical/soap-synthesize', { headers: H(tA), body: { notes: { a: 1 } }, note: 'notes:objeto' });
await req('mood_no_patient', 'POST', '/api/v1/portal/mood', { headers: H(tA), body: { token: T.portalTokenA }, note: 'mood sin patientId' });
await req('eval_scale_number', 'POST', '/api/v1/portal/evaluations', { body: { patientId: T.patAId, token: T.portalTokenA, score: 'no_numero', answers: 'no_array' }, note: 'score/answers de tipo erróneo' });

// 3. paciente con portal deshabilitado
const patOff = `probe_pat_off_${Date.now()}`;
const tokOff = 'PN-OFF' + String(Date.now()).slice(-5);
await req('sync_off', 'POST', '/api/v1/patients/sync', { headers: H(tA), body: { patients: [{ id: patOff, name: 'Paciente Portal Off', portalToken: tokOff, portalEnabled: false }] } });
await req('portal_auth_disabled', 'POST', '/api/v1/portal/auth', { headers: { 'X-Forwarded-For': '10.77.0.5' }, body: { token: tokOff }, note: 'portal_enabled=false (esperado 401)' });

// 4. estáticos y directorios
await req('data_dir', 'GET', '/data/', { note: 'listado de directorio data' });
await req('data_no_slash', 'GET', '/data', { note: '/data sin slash' });
await req('probe_results_static', 'GET', '/revision/be-probe-results.json', { note: 'evidencia de auditoría servida públicamente' });
await req('revision_probe_script', 'GET', '/revision/be-probe.mjs', { note: 'script de auditoría servido' });
await req('tests_js', 'GET', '/tests.js', { note: 'tests.js (esperado 403)' });
await req('env_example', 'GET', '/.env.example', { note: '.env.example (esperado 403)' });
await req('dotgitignore', 'GET', '/.gitignore', { note: '.gitignore (esperado 403)' });
await req('index_html', 'GET', '/', { note: 'raíz' });

// 5. auditoría: contenido real (PII / IP / user-agent)
const audit = await req('audit_A', 'GET', '/api/v1/audit/logs', { headers: H(tA), note: 'bitácora A' });
if (Array.isArray(audit.json?.logs)) {
    console.log('   audit count:', audit.json.logs.length, '| ejemplo:', JSON.stringify(audit.json.logs.slice(-1)[0]));
    console.log('   acciones:', [...new Set(audit.json.logs.map(l => l.action))].join(','));
}
const auditB = await req('audit_B', 'GET', '/api/v1/audit/logs', { headers: H(tB), note: 'bitácora B (aislamiento)' });
const fuga = Array.isArray(auditB.json?.logs) ? auditB.json.logs.filter(l => l.therapist_id !== iB).length : -1;
console.log('   logs ajenos visibles para B:', fuga);

// 6. payload clínico: ¿los pacientes del payload quedan con therapist_id?
const patCS = `probe_pat_cs2_${Date.now()}`;
await req('cs_patient_null_tenant', 'POST', '/api/v1/clinical/sync', { headers: H(tA), body: { payload: { patients: [{ id: patCS, name: 'Paciente CS2' }], notes: [], appointments: [] } } });
await req('cs_patient_listed_by_B', 'GET', '/api/v1/patients', { headers: H(tB), note: 'B ve el paciente recién sincronizado por A' });
const visto = Array.isArray(globalThis.__x) ? false : true;

fs.writeFileSync(path.join(__dirname, 'be-probe2-results.json'), JSON.stringify({ base: BASE, results }, null, 2), 'utf8');
console.log('\nEvidencia: revision/be-probe2-results.json');
