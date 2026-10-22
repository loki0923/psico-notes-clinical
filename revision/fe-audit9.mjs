// Stage 9: form submit safety (preventDefault) + required/validation + input types
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rollup/parseAst';

const ROOT = process.cwd();
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const CLIENT_JS = ['phi-anonymizer.js', 'voice-dictation.js', 'ai-clinical.js', 'psychoed.js', 'reports.js', 'vademecum.js', 'app.js', 'scales.js', 'finance.js', 'adm.js', 'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js', 'historia-clinica.js'];
const lineOf = (code, i) => code.slice(0, i).split('\n').length;

// index every function body text for a given name
const bodies = new Map();
for (const f of CLIENT_JS) {
  const code = read(f);
  let ast; try { ast = parseAst(code); } catch { continue; }
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const c of n) walk(c); return; }
    if (n.type === 'FunctionDeclaration' && n.id) {
      if (!bodies.has(n.id.name)) bodies.set(n.id.name, []);
      bodies.get(n.id.name).push({ file: f, line: lineOf(code, n.start), text: code.slice(n.start, n.end) });
    }
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init && ['ArrowFunctionExpression', 'FunctionExpression'].includes(n.init.type)) {
      if (!bodies.has(n.id.name)) bodies.set(n.id.name, []);
      bodies.get(n.id.name).push({ file: f, line: lineOf(code, n.start), text: code.slice(n.init.start, n.init.end) });
    }
    if (n.type === 'Property' && n.key && n.key.type === 'Identifier' && ['FunctionExpression', 'ArrowFunctionExpression'].includes(n.value.type)) {
      if (!bodies.has(n.key.name)) bodies.set(n.key.name, []);
      bodies.get(n.key.name).push({ file: f, line: lineOf(code, n.start), text: code.slice(n.value.start, n.value.end) });
    }
    for (const k of Object.keys(n)) { if (['type', 'start', 'end', 'loc'].includes(k)) continue; const v = n[k]; if (v && typeof v === 'object') walk(v); }
  })(ast);
}

const SUBMIT_HANDLERS = [
  ['loginForm', '(initAuthEventListeners bind)'],
  ['registerForm', '(initAuthEventListeners bind)'],
  ['patientForm', 'handlePatientSubmit'],
  ['appointmentForm', 'handleAppointmentSubmit'],
  ['noteForm', 'handleNoteSubmit'],
  ['aiChatForm', 'handleAiChatSubmit'],
  ['therapistProfileForm', 'handleSaveTherapistProfile'],
  ['unlockForm', 'ClinicalSecurity.unlockApp'],
  ['monthlyGoalsForm', 'handleMonthlyGoalsSubmit'],
  ['scaleEditorForm', 'handleSaveCustomScale']
];

console.log('=== form submit handlers: preventDefault present? ===');
for (const [form, fn] of SUBMIT_HANDLERS) {
  const list = bodies.get(fn);
  if (!list) { console.log(`${form.padEnd(22)} -> ${fn} : *** NOT FOUND ***`); continue; }
  for (const b of list) {
    const hasPD = /preventDefault/.test(b.text);
    console.log(`${form.padEnd(22)} -> ${fn.padEnd(30)} ${hasPD ? 'preventDefault OK' : '*** NO preventDefault ***'}  (${b.file}:${b.line})`);
  }
}

// auth listeners
const authIdx = (read('app.js').split('\n').findIndex((l) => /function initAuthEventListeners/.test(l)));
console.log('\ninitAuthEventListeners at app.js:' + (authIdx + 1));
const appLines = read('app.js').split('\n');
console.log(appLines.slice(authIdx, authIdx + 55).map((l, i) => (authIdx + 1 + i) + ': ' + l).join('\n'));

// inputs missing id/name in index.html
const html = read('index.html');
console.log('\n=== <input>/<select>/<textarea> without id (index.html) ===');
let n = 0;
for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/g)) {
  const tag = m[0];
  if (/\bid\s*=/.test(tag)) continue;
  if (/type\s*=\s*["'](hidden|submit|button|checkbox|radio)["']/.test(tag) && /\bname\s*=/.test(tag)) continue;
  n++;
  if (n <= 25) console.log(`  L${lineOf(html, m.index)}: ${tag.replace(/\s+/g, ' ').slice(0, 140)}`);
}
console.log('  total without id:', n);
