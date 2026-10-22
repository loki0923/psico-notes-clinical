// FE-01 static audit — no deps beyond what ships in node_modules (rollup parseAst).
// Writes JSON + human report fragments into revision/_fe-out/.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'revision', '_fe-out');
fs.mkdirSync(OUT, { recursive: true });

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

const CLIENT_JS = [
  'phi-anonymizer.js', 'voice-dictation.js', 'ai-clinical.js', 'psychoed.js',
  'reports.js', 'vademecum.js', 'app.js', 'scales.js', 'finance.js', 'adm.js',
  'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js',
  'historia-clinica.js'
];
const PORTAL_JS = ['portal.js'];

// ---------- 1. IDs declared in HTML ----------
function htmlIds(file) {
  const src = read(file);
  const ids = [];
  const re = /\bid\s*=\s*(["'])([^"']*)\1/g;
  let m;
  while ((m = re.exec(src))) ids.push({ id: m[2].trim(), line: lineOf(src, m.index), file, raw: m[0] });
  return { src, ids };
}

const idxHtml = htmlIds('index.html');
const porHtml = htmlIds('portal.html');

const dupIndex = {};
for (const { id, line } of idxHtml.ids) (dupIndex[id] ||= []).push(line);
const dupPortal = {};
for (const { id, line } of porHtml.ids) (dupPortal[id] ||= []).push(line);

// ---------- 2. IDs consumed by JS ----------
function jsIdRefs(file) {
  const src = read(file);
  const refs = [];
  const pats = [
    /getElementById\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
    /querySelector(?:All)?\s*\(\s*(['"])#([A-Za-z0-9_\-]+)\1\s*\)/g,
    /\$\(\s*(['"])#([A-Za-z0-9_\-]+)\1\s*\)/g
  ];
  for (const re of pats) {
    let m;
    while ((m = re.exec(src))) refs.push({ id: m[2], line: lineOf(src, m.index), file, api: m[0].startsWith('get') ? 'getElementById' : 'querySelector' });
  }
  // template-literal / dynamic getElementById — flag for manual review
  const dyn = /getElementById\s*\(\s*(?!['"])/g;
  let m;
  while ((m = dyn.exec(src))) refs.push({ id: '<DYNAMIC>', line: lineOf(src, m.index), file, api: 'getElementById(dynamic)', snippet: src.slice(m.index, m.index + 120).replace(/\n/g, ' ') });
  return refs;
}

const allJs = [...CLIENT_JS, ...PORTAL_JS];
const refsByFile = {};
for (const f of allJs) refsByFile[f] = jsIdRefs(f);

const indexIdSet = new Set(idxHtml.ids.map((x) => x.id));
const portalIdSet = new Set(porHtml.ids.map((x) => x.id));

// ids referenced by index-loaded JS but absent from index.html
const missingIndexIds = [];
for (const f of CLIENT_JS) {
  for (const r of refsByFile[f]) {
    if (r.id === '<DYNAMIC>') continue;
    if (!indexIdSet.has(r.id)) missingIndexIds.push(r);
  }
}
const missingPortalIds = [];
for (const f of PORTAL_JS) {
  for (const r of refsByFile[f]) {
    if (r.id === '<DYNAMIC>') continue;
    if (!portalIdSet.has(r.id)) missingPortalIds.push(r);
  }
}

// ---------- 3. Inline handlers in HTML ----------
function inlineHandlers(file, src) {
  const out = [];
  const re = /\bon(click|change|submit|input|keyup|keydown|blur|focus|load|mouseover)\s*=\s*(["'])([\s\S]*?)\2/g;
  let m;
  while ((m = re.exec(src))) {
    const body = m[3];
    // capture leading identifier of each statement / call
    const calls = [...body.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].map((x) => x[1]);
    out.push({ file, line: lineOf(src, m.index), evt: m[1], body, calls, tag: src.slice(Math.max(0, m.index - 200), m.index).match(/<(\w+)[^>]*$/)?.[1] || '?' });
  }
  return out;
}
const handlers = [...inlineHandlers('index.html', idxHtml.src), ...inlineHandlers('portal.html', porHtml.src)];

// ---------- 4. Top-level globals defined per JS ----------
const NOT_FUNCS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'function', 'new', 'do', 'else', 'await', 'super', 'import', 'with', 'delete', 'void', 'in', 'of', 'instanceof']);

function globalsOf(file) {
  const src = read(file);
  const fn = new Set();
  const vars = new Set();
  let m;
  const reFn = /^\s*(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/gm;
  while ((m = reFn.exec(src))) fn.add(m[1]);
  const reWin = /\b(?:window|globalThis|self)\s*\.\s*([A-Za-z_$][\w$]*)\s*=/g;
  while ((m = reWin.exec(src))) vars.add(m[1]);
  const reTopVar = /^(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=/gm;
  while ((m = reTopVar.exec(src))) vars.add(m[1]);
  const reTopVar2 = /^(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*,/gm;
  while ((m = reTopVar2.exec(src))) vars.add(m[1]);
  const reWindowFn = /\bwindow\s*\.\s*([A-Za-z_$][\w$]*)\s*=/g;
  while ((m = reWindowFn.exec(src))) fn.add(m[1]);
  return { fn, vars, all: new Set([...fn, ...vars]) };
}

const perFile = {};
const ALL = new Set();
const ALL_FN = new Set();
for (const f of allJs) {
  const g = globalsOf(f);
  perFile[f] = g;
  g.all.forEach((x) => ALL.add(x));
  g.fn.forEach((x) => ALL_FN.add(x));
}

fs.writeFileSync(path.join(OUT, 'ids.json'), JSON.stringify({
  index: { count: idxHtml.ids.length, unique: indexIdSet.size, dups: Object.fromEntries(Object.entries(dupIndex).filter(([, v]) => v.length > 1)) },
  portal: { count: porHtml.ids.length, unique: portalIdSet.size, dups: Object.fromEntries(Object.entries(dupPortal).filter(([, v]) => v.length > 1)) },
  missingIndexIds, missingPortalIds,
  dynamic: allJs.flatMap((f) => refsByFile[f].filter((r) => r.id === '<DYNAMIC>')),
  idList: { index: [...indexIdSet].sort(), portal: [...portalIdSet].sort() }
}, null, 1));

fs.writeFileSync(path.join(OUT, 'handlers.json'), JSON.stringify({
  handlers,
  unresolved: handlers.filter((h) => h.calls.some((c) => !ALL_FN.has(c) && !['alert', 'confirm', 'prompt', 'event', 'this', 'return'].includes(c)))
}, null, 1));

fs.writeFileSync(path.join(OUT, 'globals.json'), JSON.stringify({
  perFile: Object.fromEntries(Object.entries(perFile).map(([k, v]) => [k, { fn: [...v.fn].sort(), vars: [...v.vars].sort() }])),
  allCount: ALL.size
}, null, 1));

console.log('index ids:', idxHtml.ids.length, 'unique:', indexIdSet.size, 'dups:', Object.keys(Object.fromEntries(Object.entries(dupIndex).filter(([, v]) => v.length > 1))).length);
console.log('portal ids:', porHtml.ids.length, 'unique:', portalIdSet.size, 'dups:', Object.keys(Object.fromEntries(Object.entries(dupPortal).filter(([, v]) => v.length > 1))).length);
console.log('missing index ids:', missingIndexIds.length, ' unique:', new Set(missingIndexIds.map((r) => r.id)).size);
console.log('missing portal ids:', missingPortalIds.length, ' unique:', new Set(missingPortalIds.map((r) => r.id)).size);
console.log('inline handlers:', handlers.length, 'with unresolved call:', handlers.filter((h) => h.calls.some((c) => !ALL_FN.has(c))).length);
console.log('total globals collected:', ALL.size);
