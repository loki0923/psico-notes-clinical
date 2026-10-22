// Stage 5: listeners inside render fns, innerHTML XSS sinks, localStorage keys, classList vs CSS
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rollup/parseAst';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'revision', '_fe-out');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const CLIENT_JS = ['phi-anonymizer.js', 'voice-dictation.js', 'ai-clinical.js', 'psychoed.js', 'reports.js', 'vademecum.js', 'app.js', 'scales.js', 'finance.js', 'adm.js', 'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js', 'historia-clinica.js', 'portal.js'];

const results = { listenersInFunctions: [], innerHtmlSinks: [], storage: { reads: [], writes: [] }, classList: { add: [], toggle: [], remove: [] } };

// ---------- AST: enclosing function names for addEventListener / innerHTML ----------
function fnName(node) {
  if (node.type === 'FunctionDeclaration' && node.id) return node.id.name;
  if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
    if (node.id && node.id.name) return node.id.name;
    return null; // resolves via parent VariableDeclarator / Property
  }
  return null;
}

for (const f of CLIENT_JS) {
  const code = read(f);
  let ast;
  try { ast = parseAst(code); } catch (e) { console.log('PARSE FAIL', f, e.message); continue; }
  const lineOf = (i) => code.slice(0, i).split('\n').length;

  // build parent map
  const parents = new Map();
  (function walk(n, p) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const c of n) walk(c, p); return; }
    parents.set(n, p);
    for (const k of Object.keys(n)) {
      if (['type', 'start', 'end', 'loc'].includes(k)) continue;
      const v = n[k];
      if (v && typeof v === 'object') walk(v, n);
    }
  })(ast, null);

  function enclosingFn(node) {
    let cur = parents.get(node);
    while (cur) {
      if (cur.type === 'FunctionDeclaration') return cur.id ? cur.id.name : '(anon)';
      if (cur.type === 'FunctionExpression' || cur.type === 'ArrowFunctionExpression') {
        const p = parents.get(cur);
        if (p && p.type === 'VariableDeclarator' && p.id.type === 'Identifier') return p.id.name;
        if (p && p.type === 'Property' && p.key.type === 'Identifier') return p.key.name + '()';
        if (p && p.type === 'AssignmentExpression' && p.left.type === 'MemberExpression') return p.left.property.name;
        return '(anon)';
      }
      cur = parents.get(cur);
    }
    return '(top-level)';
  }

  (function walk2(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const c of n) walk2(c); return; }

    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed) {
      const prop = n.callee.property.name;
      const ln = lineOf(n.start);
      if (prop === 'addEventListener') {
        const objTxt = code.slice(n.callee.object.start, n.callee.object.end);
        const evt = n.arguments[0] ? code.slice(n.arguments[0].start, n.arguments[0].end) : '?';
        results.listenersInFunctions.push({ file: f, line: ln, enclosing: enclosingFn(n), target: objTxt.replace(/\s+/g, ' ').slice(0, 70), event: evt });
      }
      if (prop === 'classList' || (n.callee.object.type === 'MemberExpression' && n.callee.object.property && n.callee.object.property.name === 'classList')) {
        // handled below via member chain
      }
    }

    // innerHTML = ... with interpolation
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && !n.left.computed && n.left.property.name === 'innerHTML') {
      const rhs = code.slice(n.right.start, n.right.end);
      if (rhs.includes('${')) {
        const lits = [...rhs.matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1]);
        results.innerHtmlSinks.push({ file: f, line: lineOf(n.start), enclosing: enclosingFn(n), exprs: lits.slice(0, 12), len: rhs.length });
      }
    }
    // innerHTML += / insertAdjacentHTML
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && ['insertAdjacentHTML'].includes(n.callee.property.name)) {
      const rhs = n.arguments[1] ? code.slice(n.arguments[1].start, n.arguments[1].end) : '';
      if (rhs.includes('${')) results.innerHtmlSinks.push({ file: f, line: lineOf(n.start), enclosing: enclosingFn(n), exprs: [...rhs.matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1]).slice(0, 12), len: rhs.length, api: 'insertAdjacentHTML' });
    }

    // classList.add('x') / toggle('x')
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.object.type === 'MemberExpression' && n.callee.object.property && n.callee.object.property.name === 'classList') {
      const meth = n.callee.property.name;
      const arg = n.arguments[0] && n.arguments[0].type === 'Literal' ? n.arguments[0].value : null;
      if (arg && ['add', 'toggle', 'remove'].includes(meth)) results.classList[meth].push({ cls: arg, file: f, line: lineOf(n.start) });
    }

    // localStorage
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression') {
      const m = n.callee.property.name;
      const objTxt = code.slice(n.callee.object.start, n.callee.object.end);
      if (objTxt === 'localStorage' && ['getItem', 'setItem', 'removeItem'].includes(m)) {
        const keyArg = n.arguments[0] ? code.slice(n.arguments[0].start, n.arguments[0].end) : '?';
        if (m === 'getItem') results.storage.reads.push({ file: f, line: lineOf(n.start), key: keyArg.replace(/\s+/g, ' ').slice(0, 90) });
        if (m === 'setItem') results.storage.writes.push({ file: f, line: lineOf(n.start), key: keyArg.replace(/\s+/g, ' ').slice(0, 90) });
      }
    }
    for (const k of Object.keys(n)) {
      if (['type', 'start', 'end', 'loc'].includes(k)) continue;
      const v = n[k];
      if (v && typeof v === 'object') walk2(v);
    }
  })(ast);
}

fs.writeFileSync(path.join(OUT, 'stage5.json'), JSON.stringify(results, null, 1));

// ------- report: listeners inside render* functions (duplicate-listener risk) -------
const renderish = results.listenersInFunctions.filter((x) => /render|update|refresh|draw|paint|fill/i.test(x.enclosing || ''));
const key = (x) => `${x.enclosing}::${x.target}::${x.event}`;
const grouped = new Map();
for (const r of renderish) { if (!grouped.has(key(r))) grouped.set(key(r), []); grouped.get(key(r)).push(r); }
console.log('=== addEventListener inside render/update/refresh functions ===');
for (const [, v] of [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${(v[0].enclosing || '').padEnd(36)} target=${v[0].target.padEnd(44)} evt=${v[0].event}`);
  console.log('    ' + v.map((x) => x.file + ':' + x.line).join(', '));
}
console.log('\ntotal listeners:', results.listenersInFunctions.length, ' renderish:', renderish.length);

// ------- storage key inventory -------
const normKey = (k) => k.replace(/^['"]|['"]$/g, '');
const readKeys = new Map(), writeKeys = new Map();
for (const r of results.storage.reads) { const k = normKey(r.key); if (!readKeys.has(k)) readKeys.set(k, []); readKeys.get(k).push(r.file + ':' + r.line); }
for (const r of results.storage.writes) { const k = normKey(r.key); if (!writeKeys.has(k)) writeKeys.set(k, []); writeKeys.get(k).push(r.file + ':' + r.line); }
console.log('\n=== localStorage keys written-but-never-read ===');
for (const [k, v] of writeKeys) if (!readKeys.has(k)) console.log('  ', k.padEnd(50), v[0]);
console.log('=== localStorage keys read-but-never-written ===');
for (const [k, v] of readKeys) if (!writeKeys.has(k)) console.log('  ', k.padEnd(50), v[0]);
console.log('=== keys WITHOUT uid/patientId scoping (potential cross-user leak) ===');
const unscoped = new Set();
for (const k of [...readKeys.keys(), ...writeKeys.keys()]) {
  if (/null_fixed_key/.test(k)) continue;
  if (/\$\{|unionId|userStorageKey|_key_/.test(k)) continue; // dynamic → manual
  unscoped.add(k);
}
for (const k of [...unscoped].sort()) console.log('  ', k);

// ------- classList classes vs styles.css -------
const css = read('styles.css') + '\n' + read('portal.css');
const allCls = new Set();
for (const m of results.classList.add) allCls.add(m.cls);
for (const m of results.classList.toggle) allCls.add(m.cls);
for (const m of results.classList.remove) allCls.add(m.cls);
const missing = [];
for (const c of allCls) {
  const re = new RegExp(`\\.${c.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}(?![\\w-])`);
  if (!re.test(css)) missing.push(c);
}
console.log('\n=== classList classes NOT found in styles.css/portal.css ===');
console.log(missing.sort().join(', '));
fs.writeFileSync(path.join(OUT, 'missing-classes.json'), JSON.stringify(missing.sort(), null, 1));

// ------- XSS sink candidates: interpolate patient/note/free-text -------
const risky = results.innerHtmlSinks.filter((s) => s.exprs.some((e) => /\.(name|notes|content|reason|observations|text|description|title|message|feedback|comment|answer|response|diagnosis|email|phone|address)\b/i.test(e)) || /patient|note|Paciente|nota/i.test(s.exprs.join(' ')));
console.log('\n=== innerHTML sinks interpolating patient/note free-text ===');
for (const s of risky.slice(0, 60)) console.log(`${s.file}:${s.line}  [${s.enclosing}]  ${s.exprs.join(' | ').slice(0, 130)}`);
console.log('count risky:', risky.length, 'of', results.innerHtmlSinks.length, 'total template innerHTML');
