// Stage 3: AST-based symbol table + unresolved-callee detection.
// Uses rollup's bundled parseAst (already in node_modules) — no installs.
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rollup/parseAst';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'revision', '_fe-out');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const CLIENT_JS = ['phi-anonymizer.js', 'voice-dictation.js', 'ai-clinical.js', 'psychoed.js', 'reports.js', 'vademecum.js', 'app.js', 'scales.js', 'finance.js', 'adm.js', 'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js', 'historia-clinica.js'];

// pull inline <script> bodies out of index.html with a line offset
function inlineScripts(file) {
  const src = read(file);
  const out = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(src))) {
    const startLine = src.slice(0, m.index).split('\n').length;
    // body starts after the opening tag: count newlines before body start
    const bodyOffset = m.index + m[0].indexOf('>') + 1;
    const bodyLine = src.slice(0, bodyOffset).split('\n').length;
    out.push({ file, label: `${file}#inline@${bodyLine}`, code: m[1], bodyLine, startLine });
  }
  return out;
}
const inline = [...inlineScripts('index.html'), ...inlineScripts('portal.html')];

// ---------- generic AST walk ----------
function walk(node, fn, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const c of node) walk(c, fn, parent); return; }
  if (typeof node.type === 'string') fn(node, parent);
  for (const k of Object.keys(node)) {
    if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
    const v = node[k];
    if (v && typeof v === 'object') walk(v, fn, node);
  }
}

const BODIES = [];
for (const f of [...CLIENT_JS, 'portal.js']) BODIES.push({ label: f, code: read(f), file: f, bodyLine: 1 });
for (const s of inline) BODIES.push({ label: s.label, code: s.code, file: s.file, bodyLine: s.bodyLine });

// ---------- pass 1: collect definitions ----------
const defs = new Map();   // name -> [{file,line,kind}]
const nsMethods = new Map(); // "Ns.method" -> [{file,line}]
const allCalls = [];      // {name, file, line, kind}
const memberCalls = [];   // {obj, prop, file, line}

const lineOf = (code, idx) => code.slice(0, idx).split('\n').length;

function collectObjectKeys(objExpr, nsName, file, bodyLine, code) {
  for (const p of objExpr.properties || []) {
    if (p.type !== 'Property' || p.computed) continue;
    const keyName = p.key.type === 'Identifier' ? p.key.name : (p.key.type === 'Literal' ? String(p.key.value) : null);
    if (!keyName) continue;
    const full = `${nsName}.${keyName}`;
    if (!nsMethods.has(full)) nsMethods.set(full, []);
    nsMethods.get(full).push({ file, line: bodyLine + lineOf(code, p.start) - 1, kind: p.value.type === 'FunctionExpression' || p.value.type === 'ArrowFunctionExpression' ? 'method' : 'prop' });
  }
}

for (const b of BODIES) {
  let ast;
  try { ast = parseAst(b.code); }
  catch (e) { console.log(`PARSE FAIL ${b.label}: ${e.message}`); continue; }
  walk(ast, (node) => {
    const ln = b.bodyLine + lineOf(b.code, node.start) - 1;
    switch (node.type) {
      case 'FunctionDeclaration':
        if (node.id) { if (!defs.has(node.id.name)) defs.set(node.id.name, []); defs.get(node.id.name).push({ file: b.label, line: ln, kind: 'function' }); }
        break;
      case 'ClassDeclaration':
        if (node.id) { if (!defs.has(node.id.name)) defs.set(node.id.name, []); defs.get(node.id.name).push({ file: b.label, line: ln, kind: 'class' }); }
        break;
      case 'VariableDeclarator':
        if (node.id.type === 'Identifier') {
          if (!defs.has(node.id.name)) defs.set(node.id.name, []);
          defs.get(node.id.name).push({ file: b.label, line: ln, kind: 'var' });
          if (node.init && node.init.type === 'ObjectExpression') collectObjectKeys(node.init, node.id.name, b.label, b.bodyLine, b.code);
          if (node.init && (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')) {
            defs.get(node.id.name).push({ file: b.label, line: ln, kind: 'fn-expr' });
          }
        }
        break;
      case 'AssignmentExpression': {
        // window.X = ...  /  globalThis.X = ...
        const L = node.left;
        if (L.type === 'MemberExpression' && L.object.type === 'Identifier' && ['window', 'globalThis', 'self'].includes(L.object.name) && !L.computed) {
          const nm = L.property.name;
          if (!defs.has(nm)) defs.set(nm, []);
          defs.get(nm).push({ file: b.label, line: ln, kind: 'window-assign' });
          if (node.right.type === 'ObjectExpression') collectObjectKeys(node.right, nm, b.label, b.bodyLine, b.code);
          if (node.right.type === 'Identifier') collectObjectKeysAlias(nm, node.right.name);
        }
        if (L.type === 'Identifier') {
          if (!defs.has(L.name)) defs.set(L.name, []);
          defs.get(L.name).push({ file: b.label, line: ln, kind: 'assignment' });
        }
        break;
      }
      case 'CallExpression': {
        const c = node.callee;
        if (c.type === 'Identifier') allCalls.push({ name: c.name, file: b.label, line: ln });
        else if (c.type === 'MemberExpression' && !c.computed) {
          const objName = c.object.type === 'Identifier' ? c.object.name : (c.object.type === 'ThisExpression' ? 'this' : null);
          if (objName) memberCalls.push({ obj: objName, prop: c.property.name, file: b.label, line: ln });
        }
        break;
      }
      case 'NewExpression':
        if (node.callee.type === 'Identifier') allCalls.push({ name: node.callee.name, file: b.label, line: ln, kind: 'new' });
        break;
      case 'AssignmentPattern':
        if (node.left.type === 'Identifier') { if (!defs.has(node.left.name)) defs.set(node.left.name, []); defs.get(node.left.name).push({ file: b.label, line: ln, kind: 'param-default' }); }
        break;
      case 'CatchClause':
        if (node.param && node.param.type === 'Identifier') { if (!defs.has(node.param.name)) defs.set(node.param.name, []); defs.get(node.param.name).push({ file: b.label, line: ln, kind: 'catch' }); }
        break;
    }
  }, null);
  // function params (separate pass for Function nodes)
  walk(ast, (node) => {
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      for (const p of node.params || []) {
        const ids = [];
        walk(p, (n) => { if (n.type === 'Identifier') ids.push(n.name); });
        for (const nm of ids) { if (!defs.has(nm)) defs.set(nm, []); defs.get(nm).push({ file: b.label, line: b.bodyLine, kind: 'param' }); }
      }
    }
  });
}
function collectObjectKeysAlias(winName, varName) {
  // window.X = Y  where Y is a previously declared object literal -> already collected under Y
  if (!defs.has(varName)) return;
  // note: keys were collected when the var was declared
}

const BUILTIN = new Set(`
parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent encodeURI decodeURI
setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame
alert confirm prompt fetch structuredClone queueMicrotask
String Number Boolean Array Object Function Symbol BigInt Math JSON Date RegExp Promise Map Set WeakMap WeakSet Proxy Reflect
Error TypeError RangeError SyntaxError ReferenceError EvalError URIError AggregateError
Intl console document window globalThis self navigator location history localStorage sessionStorage
indexedDB caches crypto performance CustomEvent Event EventTarget Element HTMLElement Node NodeList
FileReader File FileList Blob FormData URL URLSearchParams Headers Request Response AbortController
IntersectionObserver MutationObserver ResizeObserver WebSocket Worker Notification Audio AudioContext
Image Option Text Range DOMRect DOMException XMLHttpRequest crypto
atob btoa escape unescape print getComputedStyle matchMedia scrollTo scrollBy open close postMessage
requestIdleCallback reportError dispatchEvent addEventListener removeEventListener
Uint8Array Uint32Array Int32Array Float32Array ArrayBuffer DataView Uint8ClampedArray
Promise
pdf exportTracker WebSocket
`.split(/\s+/).filter(Boolean));

// unresolved = called identifiers with no definition anywhere and not a builtin
const unresolved = allCalls.filter((c) => !defs.has(c.name) && !BUILTIN.has(c.name));
const uniqUnresolved = new Map();
for (const u of unresolved) {
  if (!uniqUnresolved.has(u.name)) uniqUnresolved.set(u.name, []);
  uniqUnresolved.get(u.name).push(u);
}

// member calls on known namespaces: Ns.prop where Ns is a known global but prop never defined on it
const nsUnresolved = [];
for (const mc of memberCalls) {
  if (!defs.has(mc.obj)) continue;
  const full = `${mc.obj}.${mc.prop}`;
  if (nsMethods.has(full)) continue;
  // if the object literal for that ns was captured, and prop missing -> suspicious
  const knownKeys = [...nsMethods.keys()].filter((k) => k.startsWith(mc.obj + '.'));
  if (knownKeys.length > 0) nsUnresolved.push(mc);
}
const uniqNs = new Map();
for (const u of nsUnresolved) {
  const k = `${u.obj}.${u.prop}`;
  if (!uniqNs.has(k)) uniqNs.set(k, []);
  uniqNs.get(k).push(u);
}

fs.writeFileSync(path.join(OUT, 'ast.json'), JSON.stringify({
  defsCount: defs.size,
  unresolved: [...uniqUnresolved.entries()].map(([name, v]) => ({ name, count: v.length, sites: v.slice(0, 6) })),
  nsUnresolved: [...uniqNs.entries()].map(([name, v]) => ({ name, count: v.length, sites: v.slice(0, 6) })),
  nsMethods: Object.fromEntries([...nsMethods.entries()].map(([k, v]) => [k, v.length])),
  inlineScripts: inline.map((s) => ({ label: s.label, lines: s.code.split('\n').length }))
}, null, 1));

console.log('defs:', defs.size, 'calls:', allCalls.length, 'unresolved unique:', uniqUnresolved.size);
console.log('--- UNRESOLVED CALLEES ---');
for (const [name, v] of [...uniqUnresolved.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(name.padEnd(34), 'x' + v.length, v[0].file + ':' + v[0].line);
}
console.log('\n--- NS MEMBER CALLS NOT DEFINED ---', uniqNs.size);
for (const [k, v] of [...uniqNs.entries()].sort()) console.log(k.padEnd(46), 'x' + v.length, v[0].file + ':' + v[0].line);
