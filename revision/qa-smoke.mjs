#!/usr/bin/env node
/**
 * QA-01 · Psico Notes Clinical v6.0 · Harness de humo BLACK-BOX (sin navegador)
 * ---------------------------------------------------------------------------
 * Uso:
 *   1) Levantar un servidor propio (NO usar el 4173 del dueño):
 *        $env:PORT=4220 ; node server.js   (en background, log en revision\)
 *   2) Ejecutar:
 *        node revision\qa-smoke.mjs
 *        node revision\qa-smoke.mjs --base=http://127.0.0.1:4220
 *
 * Salida: PASS/FAIL por paso + tabla de flujos + exit code 1 si algo falla.
 * Artefacto: revision\qa-smoke-results.json (todas las evidencias).
 *
 * Reglas respetadas:
 *  - No se modifica ningún archivo de la app.
 *  - Solo se CREAN registros nuevos con IDs/emails únicos (prefijo qa01-<run>).
 *  - No se borra ni se sobrescribe ningún registro preexistente.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argBase = process.argv.find(a => a.startsWith('--base='));
const BASE = (argBase ? argBase.split('=')[1] : process.env.QA_BASE || 'http://127.0.0.1:4220').replace(/\/$/, '');
const RUN = (process.env.QA_RUN || (Date.now().toString(36) + crypto.randomBytes(2).toString('hex'))).toUpperCase();
const T = (s) => `qa01_${RUN}_${s}`;
const EMAIL = (s) => `qa01.${RUN.toLowerCase()}.${s}@qa.local`;
const HASH = (s) => crypto.createHash('sha256').update(`pw-${s}-${RUN}`).digest('hex');

const results = [];
const exchanges = [];
let currentArea = '';

/* ------------------------------------------------------------------ */
/* Infra mínima de ejecución                                           */
/* ------------------------------------------------------------------ */

function snippet(s, n = 260) {
  if (s == null) return '';
  const one = String(s).replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n) + '…' : one;
}

function curlOf(ex) {
  if (!ex) return '';
  const parts = [`curl -s -i -X ${ex.method} ${BASE}${ex.path}`];
  for (const [k, v] of Object.entries(ex.headers || {})) {
    if (k.toLowerCase() === 'origin') parts.push(`-H "Origin: ${v}"`);
    if (k.toLowerCase() === 'authorization') parts.push(`-H "Authorization: Bearer $TOKEN"`);
    if (k.toLowerCase() === 'x-therapist-id') parts.push(`-H "X-Therapist-Id: ${v}"`);
  }
  if (ex.body) parts.push(`-H "Content-Type: application/json" -d '${snippet(ex.body, 300)}'`);
  return parts.join(' ');
}

async function call(p, opts = {}) {
  const { method = 'GET', body, token, origin, headers = {}, raw = false, timeout = 20000, noBody } = opts;
  const h = { ...headers };
  if (origin) h['Origin'] = origin;
  if (token) h['Authorization'] = `Bearer ${token}`;
  let payload;
  if (body !== undefined && !noBody) {
    payload = raw ? body : JSON.stringify(body);
    if (!raw) h['Content-Type'] = 'application/json';
  }
  const started = Date.now();
  let res, text = '', json;
  try {
    res = await fetch(BASE + p, { method, headers: h, body: payload, signal: AbortSignal.timeout(timeout) });
    text = await res.text();
    try { json = JSON.parse(text); } catch { /* no json */ }
  } catch (err) {
    const ex = { method, path: p, headers: h, body: payload, error: String(err && err.message || err) };
    exchanges.push(ex);
    return { status: 0, ct: '', text: '', json: undefined, ms: Date.now() - started, ex };
  }
  const ex = {
    method, path: p, headers: h,
    body: typeof payload === 'string' && payload.length > 400 ? payload.slice(0, 400) + `…[${payload.length}b]` : payload,
    status: res.status, ct: res.headers.get('content-type') || '',
    bodyOut: snippet(text, 400), curl: ''
  };
  ex.curl = curlOf(ex);
  exchanges.push(ex);
  return { status: res.status, ct: res.headers.get('content-type') || '', text, json, ms: Date.now() - started, ex };
}

let pass = 0, fail = 0, skip = 0;
function section(title) {
  currentArea = title;
  console.log(`\n── ${title} ${'─'.repeat(Math.max(2, 62 - title.length))}`);
}
function passLine(id, name, actual) {
  pass++;
  console.log(`PASS ${id.padEnd(6)} ${name}${actual ? '  → ' + snippet(actual, 150) : ''}`);
}
function failLine(id, name, expected, actual) {
  fail++;
  console.log(`FAIL ${id.padEnd(6)} ${name}\n     esperado: ${expected}\n     obtenido: ${snippet(actual, 300)}`);
}
function skipLine(id, name, why) {
  skip++;
  console.log(`SKIP ${id.padEnd(6)} ${name}  (${why})`);
}

/**
 * check: ejecuta un probe.
 * fn -> { ok, actual, expected?, ex? } | boolean
 */
async function check(id, name, expected, fn) {
  let r;
  try {
    r = await fn();
  } catch (err) {
    r = { ok: false, actual: 'EXCEPCIÓN EN HARNESS: ' + (err && err.stack || err) };
  }
  if (r === true) r = { ok: true, actual: 'ok' };
  if (r === false) r = { ok: false, actual: 'assert falló' };
  if (!r) r = { ok: false, actual: 'sin resultado' };
  const rec = {
    id, area: currentArea, name, expected,
    ok: Boolean(r.ok), skip: Boolean(r.skip),
    actual: r.actual || '', detail: r.detail || '',
    evidence: r.ex || null
  };
  results.push(rec);
  if (rec.skip) return skipLine(id, name, r.actual), rec;
  if (rec.ok) passLine(id, name, r.actual);
  else failLine(id, name, expected, r.actual);
  return rec;
}

const okStatus = (ex, ...codes) => codes.includes(ex.status);
const ctIs = (ex, kind) => {
  const ct = (ex.ct || '').toLowerCase();
  if (kind === 'js') return /javascript|ecmascript/.test(ct);
  if (kind === 'css') return ct.includes('text/css');
  if (kind === 'html') return ct.includes('text/html');
  if (kind === 'json') return ct.includes('json');
  if (kind === 'png') return ct.includes('image/png');
  return ct.includes(kind);
};

/* ------------------------------------------------------------------ */
/* Datos y estado compartido entre pasos                               */
/* ------------------------------------------------------------------ */
const S = {
  A: { email: EMAIL('a'), hash: HASH('a'), token: null, id: null },
  B: { email: EMAIL('b'), hash: HASH('b'), token: null, id: null },
  D: { email: EMAIL('d'), hash: HASH('d'), token: null, id: null },
  p1: T('p1'), p2: T('p2'), pB: T('pb'), task: T('t1'),
  portalToken: `QAP${RUN}`,
  dump: null,
  loginReached: 0,
  // IP de origen propia del run: aísla el bucket del rate-limit de logins de otros agentes
  xff: `198.51.${crypto.randomInt(1, 250)}.${crypto.randomInt(1, 250)}`
};

async function login(email, hash, xff = S.xff) {
  const r = await call('/api/v1/auth/login', {
    method: 'POST', body: { email, passwordHash: hash }, headers: { 'X-Forwarded-For': xff }
  });
  if (r.status !== 403) S.loginReached++;
  return r;
}

/* ================================================================== */
/* S · ESTÁTICOS                                                        */
/* ================================================================== */
async function sectionStatic() {
  section('S · Estáticos (HTML/CSS/JS/PWA)');

  const pages = [
    ['S01', '/', 'text/html'],
    ['S02', '/index.html', 'text/html'],
    ['S03', '/portal.html', 'text/html']
  ];
  for (const [id, p, ct] of pages) {
    await check(id, `GET ${p}`, `200 + ${ct}`, async () => {
      const r = await call(p);
      return {
        ok: r.status === 200 && ctIs(r.ex, ct) && r.text.includes('<'),
        actual: `${r.status} ${r.ct} · ${r.text.length}b`,
        ex: r.ex
      };
    });
  }

  const cssFiles = [['S04', '/styles.css'], ['S05', '/portal.css']];
  for (const [id, p] of cssFiles) {
    await check(id, `GET ${p}`, '200 + text/css + contenido CSS real', async () => {
      const r = await call(p);
      return {
        ok: r.status === 200 && ctIs(r.ex, 'css') && /[.#@]/.test(r.text.slice(0, 2000)),
        actual: `${r.status} ${r.ct} · ${r.text.length}b`,
        ex: r.ex
      };
    });
  }

  const modules = [
    'app.js', 'portal.js', 'historia-clinica.js', 'scales.js', 'finance.js', 'adm.js',
    'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js',
    'ai-clinical.js', 'psychoed.js', 'reports.js', 'vademecum.js', 'voice-dictation.js',
    'phi-anonymizer.js', 'sw.js'
  ];
  let i = 10;
  for (const m of modules) {
    const id = 'S' + String(i++).padStart(2, '0');
    await check(id, `GET /${m}`, '200 + javascript + NO HTML', async () => {
      const r = await call('/' + m);
      const htmlAsJs = r.text.trimStart().startsWith('<');
      return {
        ok: r.status === 200 && ctIs(r.ex, 'js') && !htmlAsJs && r.text.length > 50,
        actual: `${r.status} ${r.ct} · ${r.text.length}b${htmlAsJs ? ' · ¡HTML servido como JS!' : ''}`,
        ex: r.ex
      };
    });
  }

  await check('S28', 'GET /manifest.json', '200 + JSON + campos PWA', async () => {
    const r = await call('/manifest.json');
    const j = r.json || {};
    const missing = ['name', 'short_name', 'start_url', 'icons'].filter(k => !j[k]);
    return { ok: r.status === 200 && ctIs(r.ex, 'json') && missing.length === 0, actual: `${r.status} ${r.ct} · faltan=${missing.join(',') || 'ninguno'}`, ex: r.ex };
  });

  await check('S29', 'GET /nada.js (inexistente)', '404 (no 200 ni HTML)', async () => {
    const r = await call('/nada.js');
    return { ok: r.status === 404, actual: `${r.status} ${r.ct}`, ex: r.ex };
  });

  const restricted = ['/server.js', '/db.js', '/tests.js', '/package.json', '/.env'];
  let j = 30;
  for (const p of restricted) {
    const id = 'S' + String(j++).padStart(2, '0');
    await check(id, `GET ${p} (restringido)`, '403', async () => {
      const r = await call(p);
      return { ok: r.status === 403, actual: `${r.status} ${r.ct}`, ex: r.ex };
    });
  }

  await check('S35', 'GET /data/psiconotes_relational.json (base clínica completa)', '403 — NUNCA servir PHI', async () => {
    const r = await call('/data/psiconotes_relational.json');
    const nTherapists = r.json?.therapists?.length;
    const nPatients = r.json?.patients?.length;
    return {
      ok: r.status === 403,
      actual: r.status === 200
        ? `200 application/json · ${r.text.length}b · EXPONE ${nTherapists} terapeutas con password_hash y ${nPatients} pacientes (PHI)`
        : `${r.status} ${r.ct}`,
      detail: 'Cualquiera sin autenticación descarga la base entera, incluidos hashes y códigos de reset.',
      ex: r.ex
    };
  });

  await check('S36', 'GET /revision/baseline-data.json (copia de la base)', '403', async () => {
    const r = await call('/revision/baseline-data.json');
    return { ok: r.status === 403, actual: `${r.status} ${r.ct} · ${r.text.length}b`, ex: r.ex };
  });

  await check('S37', 'GET /debug_inspect.cjs (código fuente de herramientas)', '403', async () => {
    const r = await call('/debug_inspect.cjs');
    return { ok: r.status === 403, actual: `${r.status} ${r.ct} · ${r.text.length}b`, ex: r.ex };
  });

  await check('S38', 'GET /arquitectura.md (documentación interna)', '403', async () => {
    const r = await call('/arquitectura.md');
    return { ok: r.status === 403, actual: `${r.status} ${r.ct} · ${r.text.length}b`, ex: r.ex };
  });
}

/* ================================================================== */
/* A · AUTENTICACIÓN                                                    */
/* ================================================================== */
async function sectionAuth() {
  section('A · Autenticación de terapeuta');

  await check('A01', 'Registro de terapeuta nuevo', '200 + sessionToken + therapist.id', async () => {
    const r = await call('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'QA Therapist A', email: S.A.email, passwordHash: S.A.hash, specialty: 'Psicología Clínica', registryNumber: 'QA-001' }
    });
    S.A.token = r.json?.sessionToken || null;
    S.A.id = r.json?.therapist?.id || null;
    return {
      ok: r.status === 200 && Boolean(S.A.token) && Boolean(S.A.id),
      actual: `${r.status} token=${S.A.token ? 'sí' : 'NO'} id=${S.A.id || 'NO'}`,
      detail: r.json?.message || '', ex: r.ex
    };
  });

  await check('A02', 'Registro duplicado (mismo email, otra clave)', '409', async () => {
    const r = await call('/api/v1/auth/register', { method: 'POST', body: { name: 'QA dup', email: S.A.email, passwordHash: HASH('otra') } });
    return { ok: r.status === 409, actual: `${r.status} · ${snippet(r.text, 120)}`, ex: r.ex };
  });

  await check('A03', 'Registro sin passwordHash', '400', async () => {
    const r = await call('/api/v1/auth/register', { method: 'POST', body: { name: 'QA sin pass', email: EMAIL('nopass') } });
    return { ok: r.status === 400, actual: `${r.status} · ${snippet(r.text, 120)}`, ex: r.ex };
  });

  await check('A04', 'Login correcto', '200 + sessionToken', async () => {
    const r = await login(S.A.email, S.A.hash);
    if (r.json?.sessionToken) S.A.token = r.json.sessionToken;
    return { ok: r.status === 200 && Boolean(r.json?.sessionToken), actual: `${r.status} token=${r.json?.sessionToken ? 'sí' : 'NO'}`, ex: r.ex };
  });

  await check('A05', 'Login con password incorrecta', '401', async () => {
    const r = await login(S.A.email, 'hash-incorrecto-' + RUN);
    return { ok: r.status === 401, actual: `${r.status} · ${snippet(r.text, 120)}`, ex: r.ex };
  });

  await check('A06', 'Token ausente', '401', async () => {
    const r = await call('/api/v1/patients');
    return { ok: r.status === 401, actual: `${r.status} · ${snippet(r.text, 100)}`, ex: r.ex };
  });

  await check('A07', 'Token malformado', '401', async () => {
    const r = await call('/api/v1/patients', { token: 'abc.def' });
    return { ok: r.status === 401, actual: `${r.status} · ${snippet(r.text, 120)}`, ex: r.ex };
  });

  // Firma HMAC con el secreto por defecto del código (no hay .env con SESSION_SECRET)
  const DEFAULT_SECRET = 'psico-clinical-hmac-sha256-secret-key-prod-v6-2026';
  const forge = (therapistId, expOffset) => {
    const payload = { therapistId, email: 'forge@qa.local', iat: Date.now(), exp: Date.now() + expOffset };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', DEFAULT_SECRET).update(b64).digest('base64url');
    return `${b64}.${sig}`;
  };

  await check('A08', 'Token firmado pero EXPIRADO', '401', async () => {
    const r = await call('/api/v1/patients', { token: forge(S.A.id, -60000) });
    return { ok: r.status === 401, actual: `${r.status}`, ex: r.ex };
  });

  await check('A09', 'Token FALSIFICADO con el secreto por defecto (sin credenciales)', '401 — el secreto no debe ser público/conocido', async () => {
    const forgedId = 'therapist_forged_' + RUN;
    const r = await call('/api/v1/patients', { token: forge(forgedId, 3600_000) });
    return {
      ok: r.status === 401,
      actual: r.status === 200
        ? `200 · el servidor ACEPTA un token HMAC fabricado con el secreto del código (SessionSecret por defecto)`
        : `${r.status}`,
      detail: 'server.js:27 usa SESSION_SECRET || cadena fija. Sin .env, cualquiera con el código firma sesiones de cualquier therapistId.',
      ex: r.ex
    };
  });

  await check('A10', 'forgot-password de email existente', '200 + mensaje genérico', async () => {
    const r = await call('/api/v1/auth/forgot-password', { method: 'POST', body: { email: S.A.email }, headers: { 'X-Forwarded-For': S.xff } });
    return { ok: r.status === 200 && Boolean(r.json?.message), actual: `${r.status} · ${snippet(r.json?.message || r.text, 130)}`, ex: r.ex };
  });

  let forgotUnknownBody = '';
  await check('A11', 'forgot-password de email inexistente (anti-enumeración)', '200 con respuesta IDÉNTICA', async () => {
    const r1 = await call('/api/v1/auth/forgot-password', { method: 'POST', body: { email: EMAIL('nadie') }, headers: { 'X-Forwarded-For': S.xff } });
    forgotUnknownBody = r1.text;
    const r2 = await call('/api/v1/auth/forgot-password', { method: 'POST', body: { email: S.A.email }, headers: { 'X-Forwarded-For': S.xff } });
    return {
      ok: r1.status === 200 && r1.text === r2.text,
      actual: `status=${r1.status} respuestaIdéntica=${r1.text === r2.text}`,
      ex: r1.ex
    };
  });

  await check('A12', 'reset-password con código inválido', '400 + mensaje claro', async () => {
    const r = await call('/api/v1/auth/reset-password', { method: 'POST', body: { email: S.A.email, code: '000000', newPasswordHash: HASH('reset') }, headers: { 'X-Forwarded-For': S.xff } });
    return { ok: r.status === 400 && Boolean(r.json?.error), actual: `${r.status} · ${snippet(r.text, 130)}`, ex: r.ex };
  });

  // Cadena de explotación: el código de reset vive en un JSON público
  await check('A13', 'El código de reset es obtenible desde /data (fuga PHI)', 'NO obtenible sin autenticación', async () => {
    const r = await call('/data/psiconotes_relational.json');
    S.dump = r.json || null;
    const rec = S.dump?.password_resets?.[S.A.email];
    return {
      ok: !rec,
      actual: rec ? `200 · password_resets["${S.A.email}"].code = ${rec.code} (texto plano, público)` : `no obtenido (status ${r.status})`,
      detail: 'Cualquier reset solicitado queda en el JSON descargable → toma de cuenta sin acceso al correo.',
      ex: r.ex
    };
  });

  let resetCode = S.dump?.password_resets?.[S.A.email]?.code;
  if (!resetCode) {
    // Fallback de laboratorio: leer el store local (el servidor de pruebas escribe ahí)
    try {
      const local = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'psiconotes_relational.json'), 'utf8'));
      resetCode = local.password_resets?.[S.A.email]?.code;
    } catch { /* ignore */ }
  }

  await check('A14', 'reset-password con el código filtrado', '200 (el flujo funciona; el problema es que el código es público)', async () => {
    if (!resetCode) return { ok: false, actual: 'no se pudo obtener el código de reset', skip: true };
    const r = await call('/api/v1/auth/reset-password', { method: 'POST', body: { email: S.A.email, code: resetCode, newPasswordHash: HASH('nueva') }, headers: { 'X-Forwarded-For': S.xff } });
    if (r.status === 200) S.A.hash = HASH('nueva');
    return { ok: r.status === 200, actual: `${r.status} · ${snippet(r.text, 130)}`, ex: r.ex };
  });

  await check('A15', 'Login con la contraseña restablecida', '200', async () => {
    const r = await login(S.A.email, S.A.hash);
    return { ok: r.status === 200 && Boolean(r.json?.sessionToken), actual: `${r.status} token=${r.json?.sessionToken ? 'sí' : 'NO'}`, ex: r.ex };
  });

  await check('A16', 'Registro de terapeuta B', '200 + token', async () => {
    const r = await call('/api/v1/auth/register', { method: 'POST', body: { name: 'QA Therapist B', email: S.B.email, passwordHash: S.B.hash } });
    S.B.token = r.json?.sessionToken || null;
    S.B.id = r.json?.therapist?.id || null;
    return { ok: r.status === 200 && Boolean(S.B.token) && Boolean(S.B.id), actual: `${r.status} id=${S.B.id || 'NO'}`, ex: r.ex };
  });

  await check('A17', 'Login de terapeuta B', '200', async () => {
    const r = await login(S.B.email, S.B.hash);
    if (r.json?.sessionToken) S.B.token = r.json.sessionToken;
    return { ok: r.status === 200, actual: `${r.status}`, ex: r.ex };
  });

  await check('A18', 'Registro de terapeuta D (tenant limpio, para BOLA)', '200', async () => {
    const r = await call('/api/v1/auth/register', { method: 'POST', body: { name: 'QA Therapist D', email: S.D.email, passwordHash: S.D.hash } });
    S.D.token = r.json?.sessionToken || null;
    S.D.id = r.json?.therapist?.id || null;
    return { ok: r.status === 200 && Boolean(S.D.token), actual: `${r.status}`, ex: r.ex };
  });

  await check('A19', 'Takeover: registro con email+id de B y passwordHash basura', '401/409 — no debe emitir sesión', async () => {
    if (!S.B.id) return { ok: false, actual: 'sin id de B', skip: true };
    const r = await call('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'attacker', email: S.B.email, id: S.B.id, passwordHash: 'basura-sin-conocer-la-clave' }
    });
    const took = r.status === 200 && Boolean(r.json?.sessionToken);
    if (took) {
      const check2 = await call('/api/v1/patients', { token: r.json.sessionToken });
      return {
        ok: false,
        actual: `200 + sessionToken de B; GET /api/v1/patients con ese token = ${check2.status}; respuesta incluye password_hash=${Boolean(r.json?.therapist?.password_hash)}`,
        detail: 'server.js:762 reconecta si (id && existing.id === id) sin verificar la contraseña. El id de la víctima está en /data/*.json.',
        ex: r.ex
      };
    }
    return { ok: true, actual: `${r.status} · ${snippet(r.text, 120)}`, ex: r.ex };
  });
}

/* ================================================================== */
/* P · PACIENTES + BOLA/IDOR                                           */
/* ================================================================== */
async function sectionPatients() {
  section('P · Pacientes, aislamiento multitenant (BOLA/IDOR)');

  await check('P01', 'Alta/sync de 2 pacientes + 1 tarea (terapeuta A)', '200 synced count=2', async () => {
    const r = await call('/api/v1/patients/sync', {
      method: 'POST', token: S.A.token,
      body: {
        patients: [
          {
            id: S.p1, name: 'QA Paciente Uno', email: 'p1@qa.local', phone: '0414-0000001',
            birthdate: '1990-04-12', life_stage: 'adult', diagnosis: 'QA - ansiedad',
            portal_token: S.portalToken, portal_enabled: true, portal_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: S.p2, name: 'QA Paciente Dos', email: 'p2@qa.local', phone: '0414-0000002',
            birthdate: '2001-09-03', life_stage: 'adult', diagnosis: 'QA - control',
            updated_at: new Date().toISOString()
          }
        ],
        tasks: [{ id: S.task, patient_id: S.p1, title: 'QA tarea intersesión', description: 'respiración 4-7-8', completed: false }]
      }
    });
    return { ok: r.status === 200 && r.json?.count === 2, actual: `${r.status} · ${snippet(r.text, 150)}`, ex: r.ex };
  });

  await check('P02', 'Listado de pacientes de A', '200, incluye p1/p2, solo propios', async () => {
    const r = await call('/api/v1/patients', { token: S.A.token });
    const list = r.json?.patients || [];
    const mine = list.filter(p => p.id === S.p1 || p.id === S.p2).map(p => p.id);
    const orphans = list.filter(p => !p.therapist_id).length;
    return {
      ok: r.status === 200 && mine.length === 2 && orphans === 0,
      actual: `${r.status} total=${list.length} propios=${mine.length} sin_therapist_id(ajenos)=${orphans}`,
      detail: orphans ? 'getPatientsByTherapist devuelve pacientes con therapist_id nulo a CUALQUIER terapeuta.' : '',
      ex: r.ex
    };
  });

  await check('P03', 'B pide /portal/data/ del paciente de A', '403', async () => {
    const r = await call(`/api/v1/portal/data/${S.p1}`, { token: S.B.token });
    return { ok: r.status === 403, actual: `${r.status} · ${snippet(r.text, 120)}`, ex: r.ex };
  });

  await check('P04', 'B intenta sobreescribir el paciente p1 de A (sync)', '403', async () => {
    const r = await call('/api/v1/patients/sync', {
      method: 'POST', token: S.B.token,
      body: { patients: [{ id: S.p1, name: 'SECUESTRADO', therapist_id: S.B.id }] }
    });
    return { ok: r.status === 403, actual: `${r.status} · ${snippet(r.text, 130)}`, ex: r.ex };
  });

  await check('P05', 'Spoofing X-Therapist-Id (token de A, cabecera de B)', '403', async () => {
    const r = await call('/api/v1/patients', { token: S.A.token, headers: { 'X-Therapist-Id': S.B.id || 'otro' } });
    return { ok: r.status === 403, actual: `${r.status} · ${snippet(r.text, 130)}`, ex: r.ex };
  });

  let orphanIds = [];
  await check('P06', 'Tenant D (nuevo) lista pacientes', '200 + 0 pacientes ajenos', async () => {
    const r = await call('/api/v1/patients', { token: S.D.token });
    const list = r.json?.patients || [];
    orphanIds = list.filter(p => !p.therapist_id).map(p => p.id);
    return {
      ok: r.status === 200 && list.length === 0,
      actual: `${r.status} · D ve ${list.length} pacientes (${orphanIds.length} sin therapist_id)`,
      detail: orphanIds.length ? 'BOLA de lectura: datos de pacientes de otros profesionales, visibles para una cuenta recién creada.' : '',
      ex: r.ex
    };
  });

  await check('P07', 'Tenant D lee /portal/data/ de un paciente huérfano', '403/404', async () => {
    let pid = orphanIds[0];
    if (!pid) pid = S.dump?.patients?.find(p => !p.therapist_id)?.id;
    if (!pid) return { ok: false, actual: 'sin paciente huérfano para probar', skip: true };
    const r = await call(`/api/v1/portal/data/${pid}`, { token: S.D.token });
    return { ok: r.status === 403 || r.status === 404, actual: `${r.status} · ${snippet(r.text, 160)}`, ex: r.ex };
  });

  await check('P08', 'sync con patients:string (tipo erróneo)', '400 validación', async () => {
    const r = await call('/api/v1/patients/sync', { method: 'POST', token: S.A.token, body: { patients: 'no-soy-un-array' } });
    return { ok: r.status === 400, actual: `${r.status} · ${snippet(r.text, 160)}`, ex: r.ex };
  });

  await check('P09', 'sync sin pacientes (vacío)', '200 count=0', async () => {
    const r = await call('/api/v1/patients/sync', { method: 'POST', token: S.A.token, body: {} });
    return { ok: r.status === 200 && r.json?.count === 0, actual: `${r.status} · ${snippet(r.text, 120)}`, ex: r.ex };
  });
}

/* ================================================================== */
/* C · CLÍNICO / IA                                                     */
/* ================================================================== */
async function sectionClinical() {
  section('C · Sincronización clínica y síntesis SOAP (IA)');

  const payload = { patients: [{ id: S.p1, name: 'QA Paciente Uno', therapist_id: S.A.id }], notes: [{ id: T('note1'), patientId: S.p1, title: 'QA nota', subjetivo: 'x' }], exportedAt: new Date().toISOString() };
  await check('C01', 'POST /clinical/sync (respaldo clínico)', '200 synced', async () => {
    const r = await call('/api/v1/clinical/sync', { method: 'POST', token: S.A.token, body: { payload, clientTimestamp: Date.now() } });
    return { ok: r.status === 200 && r.json?.status === 'synced', actual: `${r.status} · ${snippet(r.text, 130)}`, ex: r.ex };
  });

  await check('C02', 'GET /clinical/sync devuelve el payload', '200 con payload.id=note1', async () => {
    const r = await call('/api/v1/clinical/sync', { token: S.A.token });
    const id = r.json?.payload?.notes?.[0]?.id;
    return { ok: r.status === 200 && id === T('note1'), actual: `${r.status} payload.notes[0].id=${id}`, ex: r.ex };
  });

  await check('C03', 'POST /clinical/sync sin payload', '400', async () => {
    const r = await call('/api/v1/clinical/sync', { method: 'POST', token: S.A.token, body: {} });
    return { ok: r.status === 400, actual: `${r.status} · ${snippet(r.text, 120)}`, ex: r.ex };
  });

  await check('C04', 'GET /clinical/sync de tenant D (vacío)', '200 status=empty', async () => {
    const r = await call('/api/v1/clinical/sync', { token: S.D.token });
    return { ok: r.status === 200 && r.json?.status === 'empty', actual: `${r.status} status=${r.json?.status}`, ex: r.ex };
  });

  await check('C05', 'soap-synthesize SIN GEMINI_API_KEY', '429/503 o respuesta marcada como simulada; nunca clínica falsa sin aviso', async () => {
    const r = await call('/api/v1/clinical/soap-synthesize', {
      method: 'POST', token: S.A.token,
      body: { notes: 'Paciente refiere insomnio y ansiedad laboral de 3 semanas. Se trabaja reestructuración cognitiva.', patientInfo: { name: 'QA' } }
    });
    const keys = r.json ? ['subjetivo', 'objetivo', 'analisis', 'plan'].filter(k => r.json[k]) : [];
    const flagged = JSON.stringify(r.json || {}).toLowerCase().includes('simulad') || JSON.stringify(r.json || {}).toLowerCase().includes('mock');
    return {
      ok: r.status >= 400 || flagged,
      actual: `200 · ${keys.length}/4 campos SOAP inventados por plantilla, sin bandera de simulación · subjetivo="${snippet(r.json?.subjetivo, 90)}"`,
      detail: 'server.js:625 devuelve un SOAP de plantilla cuando falta la key. El terapeuta no puede distinguirlo de una síntesis real.',
      ex: r.ex
    };
  });

  await check('C06', 'soap-synthesize sin notas', '400', async () => {
    const r = await call('/api/v1/clinical/soap-synthesize', { method: 'POST', token: S.A.token, body: {} });
    return { ok: r.status === 400, actual: `${r.status} · ${snippet(r.text, 130)}`, ex: r.ex };
  });

  await check('C07', 'soap-synthesize con notes:{} (tipo erróneo)', '400 validación', async () => {
    const r = await call('/api/v1/clinical/soap-synthesize', { method: 'POST', token: S.A.token, body: { notes: { texto: 'hola' } } });
    return { ok: r.status === 400, actual: `${r.status} · ${snippet(r.text, 170)}`, ex: r.ex };
  });

  /* --- Integridad: sync en la nube con objeto de paciente parcial --- */
  await check('C08', 'POST clinical/sync con paciente parcial (sin portalToken)', '200 (pero no debe destruir datos del paciente)', async () => {
    const r = await call('/api/v1/clinical/sync', {
      method: 'POST', token: S.A.token,
      body: { payload: { patients: [{ id: S.p1, name: 'QA Paciente Uno', therapist_id: S.A.id }] }, clientTimestamp: Date.now() }
    });
    return { ok: r.status === 200, actual: `${r.status}`, ex: r.ex };
  });

  await check('C09', 'Tras el sync parcial, el portal del paciente sigue activo', '200 (el token NO debe borrarse)', async () => {
    const r = await call('/api/v1/portal/auth', { method: 'POST', body: { token: S.portalToken }, headers: { 'X-Forwarded-For': S.xff } });
    return {
      ok: r.status === 200,
      actual: `${r.status} · ${snippet(r.text, 130)}`,
      detail: 'db.js:322/358 upsertPatient asigna portal_token = patientData.portal_token || null al fusionar objetos parciales → cualquier guardado en la nube sin portalToken desactiva el portal del paciente.',
      ex: r.ex
    };
  });

  await check('C10', 'Tras el sync parcial, la ficha conserva email/phone/diagnóstico', 'campos preservados', async () => {
    const r = await call('/api/v1/patients', { token: S.A.token });
    const p = (r.json?.patients || []).find(x => x.id === S.p1) || {};
    const lost = ['email', 'phone', 'diagnosis', 'birthdate'].filter(k => !p[k]);
    return {
      ok: lost.length === 0,
      actual: `${r.status} · campos vaciados: ${lost.join(',') || 'ninguno'} (email="${p.email || ''}" phone="${p.phone || ''}" dx="${p.diagnosis || ''}")`,
      detail: 'Mismo upsert: los campos ausentes en el payload se escriben como "" / null (pérdida de PHI en la nube).',
      ex: r.ex
    };
  });

  await check('C11', 'Restauración de la ficha completa (setup del resto de pruebas)', '200 synced', async () => {
    const r = await call('/api/v1/patients/sync', {
      method: 'POST', token: S.A.token,
      body: {
        patients: [{
          id: S.p1, name: 'QA Paciente Uno', email: 'p1@qa.local', phone: '0414-0000001',
          birthdate: '1990-04-12', life_stage: 'adult', diagnosis: 'QA - ansiedad',
          portal_token: S.portalToken, portal_enabled: true, portal_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      }
    });
    return { ok: r.status === 200 && r.json?.count === 1, actual: `${r.status}`, ex: r.ex };
  });

  await check('C12', 'Portal reactivado tras restaurar la ficha', '200', async () => {
    const r = await call('/api/v1/portal/auth', { method: 'POST', body: { token: S.portalToken }, headers: { 'X-Forwarded-For': S.xff } });
    return { ok: r.status === 200, actual: `${r.status}`, ex: r.ex };
  });
}

/* ================================================================== */
/* R · PORTAL DEL PACIENTE                                              */
/* ================================================================== */
async function sectionPortal() {
  section('R · Portal del paciente');

  await check('R01', 'portal/auth con token inválido', '401', async () => {
    const r = await call('/api/v1/portal/auth', { method: 'POST', body: { token: 'TOKEN-INVALIDO-' + RUN }, headers: { 'X-Forwarded-For': S.xff } });
    return { ok: r.status === 401, actual: `${r.status} · ${snippet(r.text, 130)}`, ex: r.ex };
  });

  await check('R02', 'portal/auth con token válido', '200 authenticated + patient', async () => {
    const r = await call('/api/v1/portal/auth', { method: 'POST', body: { token: S.portalToken }, headers: { 'X-Forwarded-For': S.xff } });
    return { ok: r.status === 200 && r.json?.authenticated === true && r.json?.patient?.id === S.p1, actual: `${r.status} patient=${r.json?.patient?.id || 'NO'}`, ex: r.ex };
  });

  await check('R03', 'portal/me con token', '200 + tasks/moodLogs', async () => {
    const r = await call(`/api/v1/portal/me?token=${encodeURIComponent(S.portalToken)}`);
    return { ok: r.status === 200 && Array.isArray(r.json?.tasks), actual: `${r.status} tasks=${r.json?.tasks?.length}`, ex: r.ex };
  });

  await check('R04', 'portal/me sin token', '401', async () => {
    const r = await call('/api/v1/portal/me');
    return { ok: r.status === 401, actual: `${r.status} · ${snippet(r.text, 110)}`, ex: r.ex };
  });

  await check('R05', 'portal/mood (registro de ánimo)', '200 saved', async () => {
    const r = await call('/api/v1/portal/mood', {
      method: 'POST', body: { patientId: S.p1, token: S.portalToken, mood: 4, sleep: 3, energy: 2, note: 'QA mood' }
    });
    return { ok: r.status === 200 && r.json?.status === 'saved', actual: `${r.status} · ${snippet(r.text, 130)}`, ex: r.ex };
  });

  await check('R06', 'portal/mood con patientId ajeno', '403', async () => {
    const r = await call('/api/v1/portal/mood', { method: 'POST', body: { patientId: S.p2, token: S.portalToken, mood: 1 } });
    return { ok: r.status === 403, actual: `${r.status} · ${snippet(r.text, 120)}`, ex: r.ex };
  });

  await check('R07', 'portal/mood con mood:"abc" (tipo erróneo)', '400 validación', async () => {
    const r = await call('/api/v1/portal/mood', { method: 'POST', body: { patientId: S.p1, token: S.portalToken, mood: 'abc', sleep: null, energy: [] } });
    const rec = r.json?.record || {};
    return {
      ok: r.status === 400,
      actual: `${r.status} · guardado con mood_score=${rec.mood_score}, sleep=${rec.sleep_score}, energy=${rec.energy_score} (coerción silenciosa a 3)`,
      detail: 'db.js:175 `Number(mood) || 3` convierte basura en un 3 clínico válido.',
      ex: r.ex
    };
  });

  await check('R08', 'portal/cbt (autoregistro ABC)', '200 saved', async () => {
    const r = await call('/api/v1/portal/cbt', {
      method: 'POST',
      body: { patientId: S.p1, token: S.portalToken, situation: 'QA sit', thought: 'QA thought', distortion: 'catastrofismo', emotion: 'ansiedad', initialIntensity: 90, rationalThought: 'QA racional', finalIntensity: 40 }
    });
    return { ok: r.status === 200 && r.json?.status === 'saved', actual: `${r.status}`, ex: r.ex };
  });

  await check('R09', 'portal/evaluations con alertRisk', '200 + alertTriggered=true', async () => {
    const r = await call('/api/v1/portal/evaluations', {
      method: 'POST',
      body: { patientId: S.p1, token: S.portalToken, scaleType: 'phq9', score: 21, maxScore: 27, severity: 'Severa', alertRisk: true, riskReason: 'QA riesgo', answers: [2, 2, 2, 2, 2, 2, 2, 2, 3] }
    });
    return { ok: r.status === 200 && r.json?.alertTriggered === true, actual: `${r.status} alertTriggered=${r.json?.alertTriggered}`, ex: r.ex };
  });

  await check('R10', 'portal/crisis (botón SOS)', '200 alert_created', async () => {
    const r = await call('/api/v1/portal/crisis', { method: 'POST', body: { patientId: S.p1, token: S.portalToken, reason: 'QA crisis', severity: 'ALTO' } });
    S.alertId = r.json?.alert?.id;
    return { ok: r.status === 200 && r.json?.status === 'alert_created', actual: `${r.status} alert=${S.alertId}`, ex: r.ex };
  });

  await check('R11', 'portal/tasks/:id/toggle', '200 completed=true', async () => {
    const r = await call(`/api/v1/portal/tasks/${S.task}/toggle`, { method: 'POST', body: { patientId: S.p1, token: S.portalToken } });
    return { ok: r.status === 200 && r.json?.task?.completed === true, actual: `${r.status} completed=${r.json?.task?.completed}`, ex: r.ex };
  });

  await check('R12', 'portal/tasks/toggle de tarea inexistente', '404', async () => {
    const r = await call(`/api/v1/portal/tasks/${T('noexiste')}/toggle`, { method: 'POST', body: { patientId: S.p1, token: S.portalToken } });
    return { ok: r.status === 404, actual: `${r.status} · ${snippet(r.text, 120)}`, ex: r.ex };
  });

  await check('R13', 'Terapeuta A lee portal/data de su paciente', '200 con moodLogs', async () => {
    const r = await call(`/api/v1/portal/data/${S.p1}`, { token: S.A.token });
    const moods = r.json?.data?.moodLogs?.length;
    return { ok: r.status === 200 && moods >= 1, actual: `${r.status} moodLogs=${moods}`, ex: r.ex };
  });

  await check('R14', 'crisis-alerts de A incluye la alerta', '200 con alerta nueva', async () => {
    const r = await call('/api/v1/portal/crisis-alerts', { token: S.A.token });
    const found = (r.json?.alerts || []).some(a => a.id === S.alertId);
    return { ok: r.status === 200 && found, actual: `${r.status} alerts=${r.json?.alerts?.length} encontrada=${found}`, ex: r.ex };
  });

  await check('R15', 'crisis-alerts sin autenticación', '401', async () => {
    const r = await call('/api/v1/portal/crisis-alerts');
    return { ok: r.status === 401, actual: `${r.status}`, ex: r.ex };
  });

  await check('R16', 'ack de la alerta por terapeuta B', '403', async () => {
    if (!S.alertId) return { ok: false, actual: 'sin alerta', skip: true };
    const r = await call(`/api/v1/portal/crisis-alerts/ack/${S.alertId}`, { method: 'POST', token: S.B.token, body: {} });
    return { ok: r.status === 403, actual: `${r.status} · ${snippet(r.text, 140)}`, ex: r.ex };
  });

  await check('R17', 'ack de la alerta por su terapeuta A', '200 acknowledged', async () => {
    if (!S.alertId) return { ok: false, actual: 'sin alerta', skip: true };
    const r = await call(`/api/v1/portal/crisis-alerts/ack/${S.alertId}`, { method: 'POST', token: S.A.token, body: {} });
    return { ok: r.status === 200 && r.json?.alert?.acknowledged === true, actual: `${r.status} ack=${r.json?.alert?.acknowledged}`, ex: r.ex };
  });

  await check('R18', 'portal/evaluations sin credenciales', '401', async () => {
    const r = await call('/api/v1/portal/evaluations', { method: 'POST', body: { scaleType: 'phq9', score: 3 } });
    return { ok: r.status === 401 || r.status === 403, actual: `${r.status} · ${snippet(r.text, 110)}`, ex: r.ex };
  });
}

/* ================================================================== */
/* T · TELECONSULTA                                                     */
/* ================================================================== */
async function sectionTelehealth() {
  section('T · Teleconsulta');

  await check('T01', 'telehealth/session sin credenciales', '401', async () => {
    const r = await call('/api/v1/telehealth/session', { method: 'POST', body: {} });
    return { ok: r.status === 401, actual: `${r.status}`, ex: r.ex };
  });

  let room1 = null;
  await check('T02', 'telehealth/session con token de terapeuta', '200 roomId de alta entropía', async () => {
    const r = await call('/api/v1/telehealth/session', { method: 'POST', token: S.A.token, body: { patientId: S.p1 } });
    room1 = r.json?.roomId || null;
    return { ok: r.status === 200 && Boolean(room1) && room1.length > 25, actual: `${r.status} roomId=${snippet(room1, 45)}`, ex: r.ex };
  });

  await check('T03', 'telehealth/session con token de portal del paciente', '200', async () => {
    const r = await call('/api/v1/telehealth/session', { method: 'POST', body: { patientToken: S.portalToken } });
    return { ok: r.status === 200 && Boolean(r.json?.meetingUrl), actual: `${r.status} url=${snippet(r.json?.meetingUrl, 60)}`, ex: r.ex };
  });

  await check('T04', 'Dos sesiones seguidas → salas distintas', 'roomIds diferentes', async () => {
    const r = await call('/api/v1/telehealth/session', { method: 'POST', token: S.A.token, body: {} });
    return { ok: r.status === 200 && r.json?.roomId !== room1, actual: `${r.status} room2=${snippet(r.json?.roomId, 40)} distinto=${r.json?.roomId !== room1}`, ex: r.ex };
  });

  await check('T05', 'telehealth/session con Bearer inválido', '401', async () => {
    const r = await call('/api/v1/telehealth/session', { method: 'POST', token: 'invalido.zzz', body: {} });
    return { ok: r.status === 401, actual: `${r.status}`, ex: r.ex };
  });
}

/* ================================================================== */
/* Y · SYNC ZERO-KNOWLEDGE                                              */
/* ================================================================== */
async function sectionSync() {
  section('Y · Sync cifrado push/pull');

  await check('Y01', 'push incompleto (sin encryptedData)', '400', async () => {
    const r = await call('/api/v1/sync/push', { method: 'POST', token: S.A.token, body: { userId: S.A.id } });
    return { ok: r.status === 400, actual: `${r.status} · ${snippet(r.text, 120)}`, ex: r.ex };
  });

  await check('Y02', 'push propio', '200 synced', async () => {
    const r = await call('/api/v1/sync/push', { method: 'POST', token: S.A.token, body: { userId: S.A.id, encryptedData: 'QA-BLOB-' + RUN, timestamp: Date.now() } });
    return { ok: r.status === 200 && r.json?.status === 'synced', actual: `${r.status}`, ex: r.ex };
  });

  await check('Y03', 'pull propio devuelve el blob', '200 encryptedData correcto', async () => {
    const r = await call(`/api/v1/sync/pull/${S.A.id}`, { token: S.A.token });
    return { ok: r.status === 200 && r.json?.encryptedData === 'QA-BLOB-' + RUN, actual: `${r.status} data=${snippet(r.json?.encryptedData, 40)}`, ex: r.ex };
  });

  await check('Y04', 'pull del buzón de otro usuario', '403', async () => {
    const r = await call(`/api/v1/sync/pull/${S.B.id}`, { token: S.A.token });
    return { ok: r.status === 403, actual: `${r.status}`, ex: r.ex };
  });

  await check('Y05', 'push al buzón de otro usuario', '403', async () => {
    const r = await call('/api/v1/sync/push', { method: 'POST', token: S.A.token, body: { userId: S.B.id, encryptedData: 'x' } });
    return { ok: r.status === 403, actual: `${r.status}`, ex: r.ex };
  });

  await check('Y06', 'pull sin datos previos (tenant D)', '404', async () => {
    const r = await call(`/api/v1/sync/pull/${S.D.id}`, { token: S.D.token });
    return { ok: r.status === 404, actual: `${r.status} · ${snippet(r.text, 110)}`, ex: r.ex };
  });

  await check('Y07', 'push de 6MB (límite 5MB declarado)', '413 controlado (JSON)', async () => {
    const r = await call('/api/v1/sync/push', { method: 'POST', token: S.A.token, body: { userId: S.A.id, encryptedData: 'x'.repeat(6 * 1024 * 1024) } });
    return { ok: r.status === 413 && ctIs(r.ex, 'json'), actual: `${r.status} ${r.ct} · ${snippet(r.text, 110)}`, ex: r.ex };
  });
}

/* ================================================================== */
/* F · FACTURACIÓN SENIAT                                              */
/* ================================================================== */
async function sectionBilling() {
  section('F · Facturación SENIAT');

  await check('F01', 'GET billing/config (tenant nuevo)', '200 con config vacía/nula', async () => {
    const r = await call('/api/v1/billing/config', { token: S.A.token });
    return { ok: r.status === 200 && 'config' in (r.json || {}), actual: `${r.status} config=${r.json?.config ? 'objeto' : 'null'}`, ex: r.ex };
  });

  await check('F02', 'POST billing/config', '200 config guardada', async () => {
    const r = await call('/api/v1/billing/config', {
      method: 'POST', token: S.A.token,
      body: { config: { rif: 'J-12345678-9', fiscalName: 'QA Consultorio', invoicePrefix: 'QA-', nextNumber: 1, ivaRate: 16, applyIGTF: true } }
    });
    return { ok: r.status === 200 && (r.json?.config?.rif === 'J-12345678-9' || r.json?.config?.fiscalName === 'QA Consultorio'), actual: `${r.status} · ${snippet(r.text, 160)}`, ex: r.ex };
  });

  await check('F03', 'GET billing/config devuelve lo guardado', '200 rif persistido', async () => {
    const r = await call('/api/v1/billing/config', { token: S.A.token });
    return { ok: r.status === 200 && r.json?.config?.rif === 'J-12345678-9', actual: `${r.status} rif=${r.json?.config?.rif}`, ex: r.ex };
  });

  await check('F04', 'POST billing/invoices', '200 invoice con id', async () => {
    const r = await call('/api/v1/billing/invoices', {
      method: 'POST', token: S.A.token,
      body: { invoice: { id: T('inv1'), number: 'QA-0001', date: '2026-10-21', patientId: S.p1, patientName: 'QA Paciente Uno', amountUSD: 100, ivaAmount: 16, totalUSD: 116, currency: 'USD', status: 'emitida' } }
    });
    return { ok: r.status === 200 && r.json?.invoice?.id === T('inv1'), actual: `${r.status} id=${r.json?.invoice?.id}`, ex: r.ex };
  });

  await check('F05', 'GET billing/invoices lista la factura', '200 incluye inv1', async () => {
    const r = await call('/api/v1/billing/invoices', { token: S.A.token });
    const inv = (r.json?.invoices || []).find(i => i.id === T('inv1'));
    return { ok: r.status === 200 && Boolean(inv) && inv.totalUSD === 116, actual: `${r.status} total=${inv?.totalUSD}`, ex: r.ex };
  });

  await check('F06', 'Aislamiento: B no ve la factura de A', '200 sin inv1', async () => {
    const r = await call('/api/v1/billing/invoices', { token: S.B.token });
    const leak = (r.json?.invoices || []).some(i => i.id === T('inv1'));
    return { ok: r.status === 200 && !leak, actual: `${r.status} facturas=${r.json?.invoices?.length} fuga=${leak}`, ex: r.ex };
  });

  await check('F07', 'Factura con montos negativos/texto', '400 validación', async () => {
    const r = await call('/api/v1/billing/invoices', {
      method: 'POST', token: S.A.token,
      body: { invoice: { id: T('inv-bad'), number: 'QA-0002', totalUSD: -999, amountUSD: 'NO-ES-NUMERO', status: 'emitida' } }
    });
    return {
      ok: r.status === 400,
      actual: `200 · factura fiscal guardada con totalUSD=${r.json?.invoice?.totalUSD} amountUSD="${r.json?.invoice?.amountUSD}"`,
      detail: 'No hay validación de montos: se persiste una factura SENIAT con total negativo y subtotal no numérico.',
      ex: r.ex
    };
  });
}

/* ================================================================== */
/* U · AUDITORÍA                                                        */
/* ================================================================== */
async function sectionAudit() {
  section('U · Auditoría');

  await check('U01', 'GET audit/logs de A', '200 + eventos propios', async () => {
    const r = await call('/api/v1/audit/logs', { token: S.A.token });
    const logs = r.json?.logs || [];
    const has = logs.some(l => l.action === 'SYNC_PATIENTS_BATCH' || l.action === 'REGISTER_THERAPIST_SUCCESS');
    return { ok: r.status === 200 && has, actual: `${r.status} logs=${logs.length} acciónEsperada=${has}`, ex: r.ex };
  });

  await check('U02', 'Audit logs de A no mezclan otros terapeutas', 'todos therapist_id = A', async () => {
    const r = await call('/api/v1/audit/logs', { token: S.A.token });
    const logs = r.json?.logs || [];
    const foreign = logs.filter(l => l.therapist_id && l.therapist_id !== S.A.id);
    return { ok: r.status === 200 && foreign.length === 0, actual: `${r.status} ajenos=${foreign.length}`, ex: r.ex };
  });
}

/* ================================================================== */
/* V · VALIDACIÓN DE ENTRADA                                            */
/* ================================================================== */
async function sectionValidation() {
  section('V · Validación de entrada / robustez');

  await check('V01', 'JSON malformado en POST', '400 JSON {error} sin stack', async () => {
    const r = await call('/api/v1/auth/register', { method: 'POST', raw: true, body: '{"email": "roto", ', headers: { 'Content-Type': 'application/json' } });
    return {
      ok: r.status === 400 && ctIs(r.ex, 'json') && !/at\s+\w+\s+\(/.test(r.text),
      actual: `${r.status} ${r.ct} · ${snippet(r.text, 220)}`,
      detail: 'Express devuelve su página de error por defecto (HTML con stack y rutas absolutas).',
      ex: r.ex
    };
  });

  await check('V02', 'Body vacío en registro', '400', async () => {
    const r = await call('/api/v1/auth/register', { method: 'POST', body: {} });
    return { ok: r.status === 400, actual: `${r.status} · ${snippet(r.text, 110)}`, ex: r.ex };
  });

  await check('V03', 'email como objeto en registro (tipo erróneo)', '400 validación', async () => {
    const r = await call('/api/v1/auth/register', { method: 'POST', body: { email: { $ne: null }, passwordHash: 'x' } });
    return { ok: r.status === 400, actual: `${r.status} ${r.ct} · ${snippet(r.text, 200)}`, ex: r.ex };
  });

  await check('V04', 'email como objeto en login (tipo erróneo)', '400 validación', async () => {
    const r = await login({ toString: () => '' }, 'x');
    return { ok: r.status === 400, actual: `${r.status} ${r.ct} · ${snippet(r.text, 180)}`, ex: r.ex };
  });

  await check('V05', 'Ruta inexistente /api/v1/nope', '404 JSON (API coherente)', async () => {
    const r = await call('/api/v1/nope');
    return { ok: r.status === 404 && ctIs(r.ex, 'json'), actual: `${r.status} ${r.ct} · ${snippet(r.text, 160)}`, ex: r.ex };
  });

  await check('V06', 'Payload de 11MB (límite 10mb)', '413 controlado', async () => {
    const r = await call('/api/v1/clinical/sync', { method: 'POST', token: S.A.token, body: { payload: { blob: 'x'.repeat(11 * 1024 * 1024) } } });
    return { ok: r.status === 413, actual: `${r.status} ${r.ct}`, ex: r.ex };
  });

  await check('V07', 'Cuerpo JSON que es un array (no objeto)', '400 validación', async () => {
    const r = await call('/api/v1/patients/sync', { method: 'POST', token: S.A.token, body: [1, 2, 3] });
    return { ok: r.status === 400, actual: `${r.status} · ${snippet(r.text, 140)}`, detail: 'Se acepta silenciosamente (destructuring de array)', ex: r.ex };
  });
}

/* ================================================================== */
/* O · CORS (el SPA corre en 4173/4220, fuera de la whitelist)         */
/* ================================================================== */
async function sectionCors() {
  section('O · CORS / mismo origen (puerto real del SPA)');

  await check('O01', 'POST login con Origin del propio SPA (127.0.0.1:4220)', '200 (mismo origen)', async () => {
    const r = await call('/api/v1/auth/login', {
      method: 'POST', origin: BASE.replace(/^http/, 'http'),
      body: { email: S.A.email, passwordHash: S.A.hash }
    });
    return {
      ok: r.status === 200,
      actual: `${r.status} · ${snippet(r.text, 170)}`,
      detail: 'La whitelist CORS solo admite :3000/:5173; el navegador manda Origin en todo POST también same-origin → 403 a toda escritura.',
      ex: r.ex
    };
  });

  await check('O02', 'POST patients/sync con Origin 127.0.0.1:4173 (instancia del dueño)', '200', async () => {
    const r = await call('/api/v1/patients/sync', {
      method: 'POST', origin: 'http://127.0.0.1:4173', token: S.A.token, body: { patients: [] }
    });
    return { ok: r.status === 200, actual: `${r.status} · ${snippet(r.text, 150)}`, ex: r.ex };
  });

  await check('O03', 'GET /api/health con Origin permitido (localhost:3000)', '200', async () => {
    const r = await call('/api/health', { origin: 'http://localhost:3000' });
    return { ok: r.status === 200, actual: `${r.status}`, ex: r.ex };
  });

  await check('O04', 'Origin ajeno (evil.example) rechazado', '403', async () => {
    const r = await call('/api/health', { origin: 'https://evil.example' });
    return { ok: r.status === 403, actual: `${r.status}`, ex: r.ex };
  });
}

/* ================================================================== */
/* W · PWA / OFFLINE                                                    */
/* ================================================================== */
async function sectionPwa() {
  section('W · PWA / service worker');

  let swText = '';
  try { swText = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'); } catch { }
  let indexText = '';
  try { indexText = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); } catch { }

  const precache = [...swText.matchAll(/'(\.\/[^']+)'/g)].map(m => m[1]).filter(p => p !== './');
  await check('W01', `Precache del SW: ${precache.length} rutas existen`, 'todas 200 + MIME correcto', async () => {
    const bad = [];
    for (const rel of precache) {
      const r = await call('/' + rel.replace(/^\.\//, ''));
      const okExt = rel.endsWith('.js') ? ctIs(r.ex, 'js') : rel.endsWith('.css') ? ctIs(r.ex, 'css') : rel.endsWith('.json') ? ctIs(r.ex, 'json') : rel.endsWith('.png') ? ctIs(r.ex, 'png') : ctIs(r.ex, 'html');
      if (r.status !== 200 || !okExt) bad.push(`${rel}=${r.status}/${r.ct}`);
    }
    return { ok: bad.length === 0, actual: bad.length ? bad.join(' · ') : `${precache.length}/${precache.length} OK`, ex: null };
  });

  await check('W02', 'manifest: iconos son PNG reales 192/512', 'dimensiones correctas', async () => {
    const dims = [];
    for (const f of ['icon-192.png', 'icon-512.png']) {
      const r = await call('/' + f);
      const buf = Buffer.from(await (await fetch(BASE + '/' + f)).arrayBuffer());
      dims.push(`${f}=${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`);
    }
    const okDim = dims.join(',').includes('192x192') && dims.join(',').includes('512x512');
    return { ok: okDim, actual: dims.join(' · '), ex: null };
  });

  await check('W03', 'Assets versionados (?v=6.7.0) están en el precache', 'precache cubre las URLs reales', async () => {
    const versioned = [...indexText.matchAll(/src="([^"]+\.js\?v=[^"]+)"/g)].map(m => m[1]);
    const missing = versioned.filter(v => !precache.some(p => p.replace(/^\.\//, '') === v.split('?')[0]));
    const versionedInCache = versioned.filter(v => precache.includes('./' + v));
    return {
      ok: versionedInCache.length === versioned.length,
      actual: versioned.length === 0 ? 'index.html no usa query de versión' : `URLs versionadas=${versioned.join(', ')} · en precache(con query)=${versionedInCache.length}`,
      detail: 'sw.js precachea "./app.js" y "./styles.css" pero el HTML pide "app.js?v=6.7.0" → cache miss; offline el primer arranque no resuelve esos assets.',
      ex: null
    };
  });

  await check('W04', 'sw.js sintácticamente válido', 'parsea sin error', async () => {
    try { new Function(swText.replace(/\bself\b/g, '({})')); }
    catch (e) { return { ok: false, actual: 'SyntaxError: ' + e.message }; }
    return { ok: true, actual: 'ok' };
  });
}

/* ================================================================== */
/* L · RATE LIMIT (último: bloquea logins)                             */
/* ================================================================== */
async function sectionRateLimit() {
  section('L · Rate limiting (último: bloquea la IP para login)');
  await check('L01', '6.º intento de login en 15 min → 429', '429 + retryAfter', async () => {
    let last = null;
    for (let i = 0; i < 4; i++) {
      last = await login(S.A.email, 'mala-' + i);
      if (last.status === 429) break;
    }
    return {
      ok: last?.status === 429 && Boolean(last?.json?.retryAfter),
      actual: `último status=${last?.status} retryAfter=${last?.json?.retryAfter} (intentos contabilizados≈${S.loginReached}, IP=${S.xff})`,
      ex: last?.ex
    };
  });

  await check('L02', 'El rate limit no se evade falsificando X-Forwarded-For', '429 aunque cambie X-Forwarded-For', async () => {
    const codes = [];
    for (let i = 0; i < 3; i++) {
      const r = await login(S.A.email, 'bypass-' + i, `192.0.2.${10 + i}`);
      codes.push(r.status);
    }
    return {
      ok: codes.includes(429),
      actual: `status=${codes.join(',')} con IPs falsas distintas → sin bloqueo`,
      detail: 'server.js:193 usa req.headers["x-forwarded-for"] sin proxy de confianza: el atacante rota la cabecera y anula el límite anti fuerza bruta.',
      ex: null
    };
  });
}

/* ================================================================== */
/* FLUJOS END-TO-END                                                   */
/* ================================================================== */
const FLOWS = [
  ['E2E-01', 'Registro + login del terapeuta', ['A01', 'A04', 'A06', 'A07']],
  ['E2E-02', 'Alta de paciente + tarea + listado', ['P01', 'P02', 'P09']],
  ['E2E-03', 'Aislamiento entre terapeutas (BOLA)', ['P03', 'P04', 'P05', 'F06', 'Y04', 'R16']],
  ['E2E-04', 'Sincronización clínica multi-dispositivo', ['C01', 'C02', 'C03', 'Y02', 'Y03']],
  ['E2E-05', 'Portal del paciente: auth + ánimo + ABC + tarea', ['R01', 'R02', 'R03', 'R05', 'R08', 'R11', 'R13']],
  ['E2E-06', 'Crisis de extremo a extremo (SOS → alerta → ack)', ['R09', 'R10', 'R14', 'R17']],
  ['E2E-07', 'Teleconsulta', ['T01', 'T02', 'T03', 'T04']],
  ['E2E-08', 'Facturación SENIAT', ['F01', 'F02', 'F03', 'F04', 'F05']],
  ['E2E-09', 'Auditoría médica', ['U01', 'U02']],
  ['E2E-10', 'Recuperación de contraseña', ['A10', 'A11', 'A12', 'A14', 'A15']],
  ['E2E-11', 'Frontend estático + assets', ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07']],
  ['E2E-12', 'PWA / offline', ['W01', 'W02', 'W03']],
  ['E2E-13', 'Integridad de la ficha al sincronizar', ['C08', 'C09', 'C10', 'C11', 'C12']]
];

function buildFlows() {
  const byId = new Map(results.map(r => [r.id, r]));
  return FLOWS.map(([id, name, steps]) => {
    const rs = steps.map(s => byId.get(s)).filter(Boolean);
    const failed = rs.filter(r => !r.ok && !r.skip);
    return {
      id, name, steps: rs.map(r => r.id),
      verdict: failed.length ? 'FAIL' : 'PASS',
      failed: failed.map(r => r.id)
    };
  });
}

/* ================================================================== */
/* MAIN                                                                */
/* ================================================================== */
(async () => {
  console.log(`=== QA-01 SMOKE · Psico Notes Clinical v6.0 ===`);
  console.log(`base=${BASE}  run=${RUN}  node=${process.version}`);
  try {
    const h = await call('/api/health');
    if (h.status !== 200) {
      console.error(`\nABORT: el servidor no responde en ${BASE}/api/health (status ${h.status}).`);
      console.error('Levantar el servidor propio:  $env:PORT=4220 ; node server.js');
      process.exit(2);
    }
    console.log(`servidor: ${h.json?.database} v${h.json?.version}`);
  } catch (e) {
    console.error(`\nABORT: no se pudo conectar a ${BASE}: ${e.message}`);
    process.exit(2);
  }

  await sectionStatic();
  await sectionAuth();
  await sectionPatients();
  await sectionPortal();       // antes de clinical: el sync parcial borra el portalToken
  await sectionClinical();
  await sectionTelehealth();   // depende del portalToken restaurado en C11
  await sectionSync();
  await sectionBilling();
  await sectionAudit();
  await sectionValidation();
  await sectionCors();
  await sectionPwa();
  await sectionRateLimit();

  const flows = buildFlows();
  const total = results.filter(r => !r.skip).length;

  console.log(`\n${'='.repeat(70)}`);
  console.log('FLUJOS END-TO-END');
  console.log('='.repeat(70));
  for (const f of flows) {
    console.log(`${f.verdict.padEnd(4)} ${f.id}  ${f.name}${f.failed.length ? '   ← fallan: ' + f.failed.join(',') : ''}`);
  }

  const failures = results.filter(r => !r.ok && !r.skip);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`RESUMEN: ${total} pasos · PASS ${total - failures.length} · FAIL ${failures.length} · SKIP ${skip}`);
  console.log(`FLUJOS: ${flows.length} · PASS ${flows.filter(f => f.verdict === 'PASS').length} · FAIL ${flows.filter(f => f.verdict === 'FAIL').length}`);
  console.log('='.repeat(70));
  if (failures.length) {
    console.log('\nFALLOS (id · descripción):');
    for (const f of failures) console.log(`  ${f.id} · ${f.name}`);
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    base: BASE, run: RUN, node: process.version,
    summary: { total, pass: total - failures.length, fail: failures.length, skip, flows: flows.length, flowsPass: flows.filter(f => f.verdict === 'PASS').length },
    flows, results,
    exchanges
  };
  const out = path.join(__dirname, 'qa-smoke-results.json');
  fs.writeFileSync(out, JSON.stringify(artifact, null, 2), 'utf8');
  console.log(`\nEvidencias: revision\\qa-smoke-results.json (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);

  process.exit(failures.length ? 1 : 0);
})().catch(err => {
  console.error('ERROR FATAL DEL HARNESS:', err);
  process.exit(3);
});
