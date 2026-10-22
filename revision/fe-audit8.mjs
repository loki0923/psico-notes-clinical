// Stage 8: `typeof NAME === 'function'` / `!== 'undefined'` guards where NAME is never defined anywhere.
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rollup/parseAst';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'revision', '_fe-out');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const CLIENT_JS = ['phi-anonymizer.js', 'voice-dictation.js', 'ai-clinical.js', 'psychoed.js', 'reports.js', 'vademecum.js', 'app.js', 'scales.js', 'finance.js', 'adm.js', 'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js', 'historia-clinica.js', 'portal.js'];
const lineOf = (code, i) => code.slice(0, i).split('\n').length;

const defs = new Set();
const nsMethods = new Set();
function objectKeys(objNode, nsName) {
  for (const p of objNode.properties || []) {
    if (p.type !== 'Property' || p.computed) continue;
    const k = p.key.type === 'Identifier' ? p.key.name : (p.key.type === 'Literal' ? String(p.key.value) : null);
    if (k) nsMethods.add(`${nsName}.${k}`);
  }
}

const sources = [
  ...CLIENT_JS.map((f) => ({ label: f, code: read(f) })),
  ...(() => {
    const src = read('index.html'); const out = [];
    for (const m of src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi))
      out.push({ label: 'index.html#inline', code: m[1] });
    return out;
  })()
];

for (const { label, code } of sources) {
  let ast; try { ast = parseAst(code); } catch { continue; }
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const c of n) walk(c); return; }
    if (n.type === 'FunctionDeclaration' && n.id) defs.add(n.id.name);
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') {
      defs.add(n.id.name);
      if (n.init && n.init.type === 'ObjectExpression') objectKeys(n.init, n.id.name);
    }
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && n.left.object.type === 'Identifier' && ['window', 'globalThis', 'self'].includes(n.left.object.name) && !n.left.computed) {
      defs.add(n.left.property.name);
      if (n.right.type === 'ObjectExpression') objectKeys(n.right, n.left.property.name);
    }
    if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier') defs.add(n.left.name);
    for (const k of Object.keys(n)) { if (['type', 'start', 'end', 'loc'].includes(k)) continue; const v = n[k]; if (v && typeof v === 'object') walk(v); }
  })(ast);
}

const guards = [];
const GUARD_RE = /typeof\s+([A-Za-z_$][\w$]*)(\s*\.\s*([A-Za-z_$][\w$]*))?\s*(===|!==|==|!=)\s*(['"])/g;
for (const { label, code } of sources) {
  for (const m of code.matchAll(GUARD_RE)) {
    const base = m[1], meth = m[3], cmp = m[4];
    // only "should exist" guards
    const guardTxt = code.slice(m.index, m.index + m[0].length + 20);
    guards.push({ file: label, line: lineOf(code, m.index), base, meth, cmp, snippet: guardTxt.replace(/\s+/g, ' ').slice(0, 110) });
  }
}

const uniq = new Map();
for (const g of guards) {
  const known = g.meth ? nsMethods.has(`${g.base}.${g.meth}`) : defs.has(g.base);
  if (known) continue;
  const k = g.meth ? `${g.base}.${g.meth}` : g.base;
  if (!uniq.has(k)) uniq.set(k, []);
  uniq.get(k).push(g);
}

console.log('total typeof guards:', guards.length);
console.log('\n=== GUARDS ON SYMBOLS THAT ARE NEVER DEFINED ANYWHERE (silently skipped feature) ===');
for (const [k, v] of [...uniq.entries()].sort()) {
  console.log(`\n${k}   (${v.length}x)`);
  for (const s of v.slice(0, 6)) console.log(`   ${s.file}:${s.line}  ${s.snippet}`);
}
fs.writeFileSync(path.join(OUT, 'guards.json'), JSON.stringify({ total: guards.length, undefinedGuards: [...uniq.entries()].map(([k, v]) => ({ symbol: k, count: v.length, sites: v.map((x) => ({ file: x.file, line: x.line, snippet: x.snippet })) })) }, null, 1));
