// Stage 7: every inline handler in HTML *and* in JS template strings -> is the target function global/reachable?
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rollup/parseAst';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'revision', '_fe-out');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const CLIENT_JS = ['phi-anonymizer.js', 'voice-dictation.js', 'ai-clinical.js', 'psychoed.js', 'reports.js', 'vademecum.js', 'app.js', 'scales.js', 'finance.js', 'adm.js', 'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js', 'historia-clinica.js', 'portal.js'];
const lineOf = (code, i) => code.slice(0, i).split('\n').length;

// ---------- pass 1: build a complete symbol table (functions + var names + window assigns + ns methods) ----------
const FN = new Map();   // name -> [{file,line,kind}]
const NS = new Map();   // "Ns.method" -> [{file,line}]
const add = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v); };

function objectKeys(objNode, nsName, file, code) {
  for (const p of objNode.properties || []) {
    if (p.type !== 'Property' || p.computed) continue;
    const k = p.key.type === 'Identifier' ? p.key.name : (p.key.type === 'Literal' ? String(p.key.value) : null);
    if (k) add(NS, `${nsName}.${k}`, { file, line: lineOf(code, p.start) });
  }
}

const sources = [
  ...CLIENT_JS.map((f) => ({ label: f, code: read(f) })),
  ...(() => {
    const src = read('index.html'); const out = [];
    for (const m of src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi))
      out.push({ label: `index.html#inline@${lineOf(src, m.index + m[0].indexOf('>'))}`, code: m[1] });
    return out;
  })()
];

for (const { label, code } of sources) {
  let ast; try { ast = parseAst(code); } catch { continue; }
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const c of n) walk(c); return; }
    if (n.type === 'FunctionDeclaration' && n.id) add(FN, n.id.name, { file: label, line: lineOf(code, n.start), kind: 'fn' });
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') {
      add(FN, n.id.name, { file: label, line: lineOf(code, n.start), kind: 'var' });
      if (n.init && n.init.type === 'ObjectExpression') objectKeys(n.init, n.id.name, label, code);
    }
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && n.left.object.type === 'Identifier' && ['window', 'globalThis', 'self'].includes(n.left.object.name) && !n.left.computed) {
      add(FN, n.left.property.name, { file: label, line: lineOf(code, n.start), kind: 'window' });
      if (n.right.type === 'ObjectExpression') objectKeys(n.right, n.left.property.name, label, code);
    }
    for (const k of Object.keys(n)) { if (['type', 'start', 'end', 'loc'].includes(k)) continue; const v = n[k]; if (v && typeof v === 'object') walk(v); }
  })(ast);
}

// ---------- pass 2: collect every inline handler occurrence ----------
const sites = [];
for (const { label, code } of sources) {
  for (const m of code.matchAll(/\bon(click|change|submit|input|keyup|keydown|blur|focus|load|mouseover|dblclick|paste|mouseenter)\s*=\s*(["'])([\s\S]*?)\2/g)) {
    const body = m[3];
    const line = label.startsWith('index.html#inline') ? lineOf(read('index.html'), read('index.html').indexOf(body)) : lineOf(code, m.index);
    sites.push({ file: label, line, evt: m[1], body: body.replace(/\s+/g, ' ').slice(0, 200) });
  }
}

// extract called symbols: Fn( ... ) and Ns.method(
const BODYLESS = new Set(['if', 'for', 'while', 'switch', 'return', 'typeof', 'new', 'catch', 'function', 'void', 'delete', 'this', 'event', 'window', 'document', 'console']);
const missing = new Map(); // symbol -> sites
const resolved = new Map();
for (const s of sites) {
  const calls = [...s.body.matchAll(/([A-Za-z_$][\w$]*)\s*(\.[A-Za-z_$][\w$]*)?\s*\(/g)];
  for (const c of calls) {
    const base = c[1], meth = c[2] ? c[2].slice(1) : null;
    if (BODYLESS.has(base)) continue;
    let ok;
    let sym;
    if (meth) { sym = `${base}.${meth}`; ok = NS.has(sym) || FN.has(base) && false; if (!NS.has(sym) && !FN.has(base)) ok = false; }
    else { sym = base; ok = FN.has(base); }
    if (ok) { if (!resolved.has(sym)) resolved.set(sym, []); resolved.get(sym).push(s); }
    else { if (!missing.has(sym)) missing.set(sym, []); missing.get(sym).push(s); }
  }
}

fs.writeFileSync(path.join(OUT, 'handlers-full.json'), JSON.stringify({
  totalSites: sites.length,
  missing: [...missing.entries()].map(([k, v]) => ({ symbol: k, count: v.length, sites: v.slice(0, 5).map((s) => ({ file: s.file, line: s.line, evt: s.evt, body: s.body.slice(0, 110) })) })),
  resolvedCount: resolved.size
}, null, 1));

console.log('inline handler sites (HTML + JS templates):', sites.length);
console.log('distinct symbols resolved:', resolved.size, ' MISSING:', missing.size);
console.log('\n=== HANDLER SYMBOLS WITH NO DEFINITION ===');
for (const [sym, v] of [...missing.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${sym}   (${v.length} site(s))`);
  for (const s of v.slice(0, 4)) console.log(`   ${s.file}:${s.line}  on${s.evt}="${s.body.slice(0, 120)}"`);
}
