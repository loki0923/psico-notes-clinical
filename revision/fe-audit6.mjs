// Stage 6: load-order safety — top-level statements in modules that run before app.js and touch app globals
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rollup/parseAst';

const ROOT = process.cwd();
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const OUT = path.join(ROOT, 'revision', '_fe-out');

// load order exactly as index.html declares it
const ORDER = [
  ['phi-anonymizer.js', 0], ['voice-dictation.js', 0], ['ai-clinical.js', 0], ['psychoed.js', 0],
  ['reports.js', 0], ['vademecum.js', 0], ['app.js', 1], ['scales.js', 1], ['finance.js', 1],
  ['adm.js', 1], ['session-reminders.js', 1], ['backup.js', 1], ['crisis-protocol.js', 1],
  ['consentimiento.js', 1], ['historia-clinica.js', 1]
];
const APP_GLOBALS = ['AppState', 'ClinicalAI', 'showToast', 'saveData', 'openModal', 'closeModal', 'CloudSyncManager', 'ClinicalSecurity', 'navigateTo', 'getUsers', 'saveUsers', 'getSession', 'userStorageKey', 'updateDashboard', 'renderPatients'];

for (const [f, afterApp] of ORDER) {
  const code = read(f);
  let ast;
  try { ast = parseAst(code); } catch (e) { console.log('PARSE FAIL', f); continue; }
  const lineOf = (i) => code.slice(0, i).split('\n').length;

  const topLevelStmts = ast.body.filter((n) => n.type !== 'FunctionDeclaration' && n.type !== 'ImportDeclaration');
  const hits = [];
  for (const stmt of topLevelStmts) {
    // skip pure declaration of AppState itself / var decls with no AppState reference in initializer
    const txt = code.slice(stmt.start, stmt.end);
    // only look at statements that actually EXECUTE something
    if (!/\(|getElementById|AppState|addEventListener/.test(txt)) continue;
    const refs = APP_GLOBALS.filter((g) => new RegExp(`\\b${g}\\b`).test(txt));
    if (refs.length === 0) continue;
    // A top-level statement with these refs runs at parse time of that file -> danger if before app.js
    hits.push({ line: lineOf(stmt.start), stmt: stmt.type, refs, head: txt.replace(/\s+/g, ' ').slice(0, 150) });
  }
  if (hits.length) {
    console.log(`\n### ${f}  (loads ${afterApp ? 'AFTER' : 'BEFORE'} app.js)`);
    for (const h of hits) console.log(`  L${h.line} [${h.stmt}] refs=${h.refs.join(',')}\n      ${h.head}`);
  }
}

// Also: does any module define its AppState dependency lazily? check typeof guards at top level
console.log('\n=== top-level IIFE / immediate execution per file ===');
for (const [f] of ORDER) {
  const code = read(f);
  const m = [...code.matchAll(/^\s*(?:\(function|\(\(\)|\(async|;\s*\(function)/gm)];
  if (m.length) console.log(f, '->', m.map((x) => code.slice(0, x.index).split('\n').length).join(', '));
}
