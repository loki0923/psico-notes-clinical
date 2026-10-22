// QA-01 · sonda puntual (no forma parte del entregable)
const B = process.env.QA_BASE || 'http://127.0.0.1:4220';
const j = (o) => JSON.stringify(o);
const hdr = (xff) => ({ 'Content-Type': 'application/json', 'X-Forwarded-For': xff });

const r1 = await fetch(B + '/api/v1/auth/register', { method: 'POST', headers: hdr('10.77.0.1'), body: '{"email": "roto", ' });
console.log('malformed-json →', r1.status, r1.headers.get('content-type'), (await r1.text()).replace(/\s+/g, ' ').slice(0, 240));

const r2 = await fetch(B + '/api/v1/auth/register', { method: 'POST', headers: hdr('10.77.0.1'), body: j({ email: { a: 1 }, passwordHash: 'x' }) });
console.log('email-object-register →', r2.status, (await r2.text()).slice(0, 160));

const r3 = await fetch(B + '/api/v1/patients/sync', { method: 'POST', headers: hdr('10.77.0.1'), body: j({ patients: [] }) });
console.log('sync-no-token →', r3.status, (await r3.text()).slice(0, 120));

const res = JSON.parse(await (await import('node:fs/promises')).readFile('revision/qa-smoke-results.json', 'utf8'));
const a01 = res.results.find(r => r.id === 'A01');
console.log('A01:', a01.actual);
const token = (res.exchanges.find(e => e.path === '/api/v1/auth/register' && e.status === 200) || {}).bodyOut;
console.log('register-out:', (token || '').slice(0, 200));
