// Stage 13: functions defined but never referenced anywhere (dead features / orphan code)
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rollup/parseAst';

const ROOT = process.cwd();
const OUT = `${ROOT}/revision/_fe-out`;
const read = (f) => fs.readFileSync(`${ROOT}/${f}`, 'utf8');
const CLIENT_JS = ['phi-anonymizer.js', 'voice-dictation.js', 'ai-clinical.js', 'psychoed.js', 'reports.js', 'vademecum.js', 'app.js', 'scales.js', 'finance.js', 'adm.js', 'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js', 'historia-clinica.js', 'portal.js'];
const lineOf = (code, i) => code.slice(0, i).split('\n').length;

const sources = CLIENT_JS.map((f) => ({ f, code: read(f) }));
const allText = sources.map((s) => s.code).join('\n');
const html = read('index.html') + '\n' + read('portal.html');
const corpus = allText + '\n' + html;

const defs = [];
for (const { f, code } of sources) {
  let ast; try { ast = parseAst(code); } catch { continue; }
  (function walk(n, depth) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const c of n) walk(c, depth); return; }
    if (n.type === 'FunctionDeclaration' && n.id) defs.push({ name: n.id.name, file: f, line: lineOf(code, n.start) });
    for (const k of Object.keys(n)) { if (['type', 'start', 'end', 'loc'].includes(k)) continue; const v = n[k]; if (v && typeof v === 'object') walk(v, depth + 1); }
  })(ast, 0);
}

const orphans = [];
for (const d of defs) {
  // count references outside its own definition line
  const re = new RegExp(`\\b${d.name}\\b`, 'g');
  const refs = (corpus.match(re) || []).length;
  // a definition itself counts once; window.X = X counts; so orphans have <=1 in js corpus but check html too
  const inHtml = new RegExp(`\\b${d.name}\\b`).test(html);
  if (refs <= 1 && !inHtml) orphans.push({ ...d, refs });
}

console.log('total function declarations:', defs.length);
console.log('\n=== FUNCTIONS DEFINED BUT NEVER REFERENCED (single occurrence) ===');
console.log('count:', orphans.length);
for (const o of orphans) console.log(`  ${o.name.padEnd(44)} ${o.file}:${o.line}`);
fs.writeFileSync(`${OUT}/orphans.json`, JSON.stringify(orphans, null, 1));
