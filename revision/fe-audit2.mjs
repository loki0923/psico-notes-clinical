// Stage 2: classify missing ids as (a) dynamically created by innerHTML in JS, (b) truly dead.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'revision', '_fe-out');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ids = JSON.parse(fs.readFileSync(path.join(OUT, 'ids.json'), 'utf8'));

const CLIENT_JS = ['phi-anonymizer.js', 'voice-dictation.js', 'ai-clinical.js', 'psychoed.js', 'reports.js', 'vademecum.js', 'app.js', 'scales.js', 'finance.js', 'adm.js', 'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js', 'historia-clinica.js'];

// ids created inside JS strings (innerHTML / template literals / createElement + .id=)
const createdIn = new Map(); // id -> [{file,line}]
for (const f of CLIENT_JS) {
  const src = read(f);
  const lines = src.split('\n');
  lines.forEach((ln, i) => {
    for (const m of ln.matchAll(/\bid\s*=\s*\\?["']([A-Za-z][\w\-]*)['"]/g)) {
      const k = m[1];
      if (!createdIn.has(k)) createdIn.set(k, []);
      createdIn.get(k).push({ file: f, line: i + 1, text: ln.trim().slice(0, 160) });
    }
    for (const m of ln.matchAll(/\.id\s*=\s*['"]([A-Za-z][\w\-]*)['"]/g)) {
      const k = m[1];
      if (!createdIn.has(k)) createdIn.set(k, []);
      createdIn.get(k).push({ file: f, line: i + 1, text: ln.trim().slice(0, 160) });
    }
  });
}

const trueDead = [];
const dynCreated = [];
for (const r of ids.missingIndexIds) {
  if (createdIn.has(r.id)) dynCreated.push({ ...r, created: createdIn.get(r.id).slice(0, 2) });
  else trueDead.push(r);
}
const trueDeadPortal = [];
const dynCreatedPortal = [];
for (const r of ids.missingPortalIds) {
  if (createdIn.has(r.id)) dynCreatedPortal.push({ ...r, created: createdIn.get(r.id).slice(0, 2) });
  else trueDeadPortal.push(r);
}

const uniq = (arr) => {
  const m = new Map();
  for (const r of arr) { if (!m.has(r.id)) m.set(r.id, []); m.get(r.id).push(r); }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
};

console.log('=== TRUE DEAD (index JS, id never in index.html nor created in any JS) ===');
for (const [id, rs] of uniq(trueDead)) console.log(id.padEnd(34), rs[0].file + ':' + rs.map((x) => x.line).join(','));
console.log('\n=== TRUE DEAD (portal.js) ===');
for (const [id, rs] of uniq(trueDeadPortal)) console.log(id.padEnd(34), rs[0].file + ':' + rs.map((x) => x.line).join(','));

fs.writeFileSync(path.join(OUT, 'ids-classified.json'), JSON.stringify({
  trueDead, trueDeadPortal, dynCreatedCount: dynCreated.length, dynCreatedPortalCount: dynCreatedPortal.length,
  dynCreated, dynCreatedPortal
}, null, 1));
console.log('\nsummary: trueDeadIdx=', new Set(trueDead.map(r => r.id)).size, ' dynCreatedIdx=', new Set(dynCreated.map(r => r.id)).size, ' trueDeadPortal=', new Set(trueDeadPortal.map(r => r.id)).size, ' dynCreatedPortal=', new Set(dynCreatedPortal.map(r => r.id)).size);
