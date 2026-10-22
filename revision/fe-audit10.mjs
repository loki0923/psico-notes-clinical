// Stage 10: openModal/closeModal literal targets vs ids that exist (HTML ids + JS-created ids)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'revision', '_fe-out');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const CLIENT_JS = ['phi-anonymizer.js', 'voice-dictation.js', 'ai-clinical.js', 'psychoed.js', 'reports.js', 'vademecum.js', 'app.js', 'scales.js', 'finance.js', 'adm.js', 'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js', 'historia-clinica.js', 'portal.js'];

const html = read('index.html') + '\n' + read('portal.html');
const htmlIds = new Set([...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]));

// ids created in JS: id="x", modal.id = 'x', .id = 'x', setAttribute('id','x')
const jsIds = new Map();
for (const f of CLIENT_JS) {
  const src = read(f);
  src.split('\n').forEach((ln, i) => {
    for (const re of [/id\s*=\s*["']([A-Za-z][\w\-]*)["']/g, /\.id\s*=\s*['"]([A-Za-z][\w\-]*)['"]/g, /setAttribute\(\s*['"]id['"]\s*,\s*['"]([A-Za-z][\w\-]*)['"]/g]) {
      for (const m of ln.matchAll(re)) {
        if (!jsIds.has(m[1])) jsIds.set(m[1], []);
        jsIds.get(m[1]).push(`${f}:${i + 1}`);
      }
    }
  });
}

const known = new Set([...htmlIds, ...jsIds.keys()]);
const calls = [];
for (const f of CLIENT_JS) {
  const src = read(f);
  src.split('\n').forEach((ln, i) => {
    for (const m of ln.matchAll(/\b(openModal|closeModal|toggleModal|showModal)\s*\(\s*['"]([^'"]+)['"]/g)) {
      calls.push({ file: f, line: i + 1, fn: m[1], target: m[2], ok: known.has(m[2]) });
    }
  });
}

const missing = calls.filter((c) => !c.ok);
const byTarget = new Map();
for (const c of missing) { if (!byTarget.has(c.target)) byTarget.set(c.target, []); byTarget.get(c.target).push(c); }

console.log('modal open/close literal calls:', calls.length, ' missing targets:', byTarget.size);
console.log('\n=== openModal/closeModal targets that DO NOT EXIST ===');
for (const [t, v] of [...byTarget.entries()].sort()) {
  console.log(`\n"${t}"  (${v.length}x)  ${v[0].fn}`);
  for (const s of v.slice(0, 5)) console.log(`   ${s.file}:${s.line}`);
}

// also: modal ids declared in HTML -- are they all openable? (dead modals)
const modalHtmlIds = [...htmlIds].filter((id) => /modal|Modal|drawer|Drawer|overlay/i.test(id));
console.log('\n=== modal-ish ids in HTML ===', modalHtmlIds.length);
console.log(modalHtmlIds.join(', '));

// which of those are referenced by openModal/openModal-ish or classList.add('active')
const allSrc = CLIENT_JS.map((f) => read(f)).join('\n');
const dead = modalHtmlIds.filter((id) => !new RegExp(`['"]${id}['"]`).test(allSrc));
console.log('\n=== modal ids in HTML never referenced by any JS string ===');
console.log(dead.length ? dead.join(', ') : '(none)');

fs.writeFileSync(path.join(OUT, 'modals.json'), JSON.stringify({ calls, missing: [...byTarget.keys()], deadModals: dead }, null, 1));
