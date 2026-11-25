const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const portalHtml = fs.readFileSync('portal.html', 'utf8');

function extractHandlers(html) {
  const regex = /on(click|submit|change|input)="([^"]+)"/g;
  const handlers = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    handlers.push({ event: match[1], code: match[2].trim() });
  }
  return handlers;
}

function getCalledFunctions(handlers) {
  const fnNames = new Set();
  handlers.forEach(h => {
    // Match either fn(...) or obj.fn(...) or return fn(...)
    const clean = h.code.replace(/^return\s+/, '');
    const fnMatch = clean.match(/^([a-zA-Z0-9_$]+)\s*\(/);
    if (fnMatch) {
      fnNames.add(fnMatch[1]);
    }
  });
  return Array.from(fnNames);
}

const indexFns = getCalledFunctions(extractHandlers(indexHtml));
const portalFns = getCalledFunctions(extractHandlers(portalHtml));

// Read JS files for index
const indexJsFiles = [
  'phi-anonymizer.js', 'voice-dictation.js', 'session-recorder.js', 'ai-clinical.js',
  'psychoed.js', 'reports.js', 'vademecum.js', 'app.js', 'scales.js', 'finance.js',
  'adm.js', 'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js',
  'historia-clinica.js'
];

let indexJsCode = '';
for (const f of indexJsFiles) {
  if (fs.existsSync(f)) {
    indexJsCode += '\n' + fs.readFileSync(f, 'utf8');
  } else {
    console.warn('Missing file for index:', f);
  }
}

const portalJsFiles = ['portal.js'];
let portalJsCode = '';
for (const f of portalJsFiles) {
  if (fs.existsSync(f)) {
    portalJsCode += '\n' + fs.readFileSync(f, 'utf8');
  } else {
    console.warn('Missing file for portal:', f);
  }
}

console.log('--- Checking Index HTML Handlers ---');
const missingIndexFns = [];
for (const fn of indexFns) {
  // Check if defined as function fn, window.fn, const fn =, let fn =, var fn =
  const regex = new RegExp(`(function\\s+${fn}\\b|window\\.${fn}\\s*=|\\b${fn}\\s*=\\s*(function|\\())`);
  if (!regex.test(indexJsCode)) {
    missingIndexFns.push(fn);
  }
}
console.log('Missing/Undefined in Index:', missingIndexFns);

console.log('--- Checking Portal HTML Handlers ---');
const missingPortalFns = [];
for (const fn of portalFns) {
  const regex = new RegExp(`(function\\s+${fn}\\b|window\\.${fn}\\s*=|\\b${fn}\\s*=\\s*(function|\\())`);
  if (!regex.test(portalJsCode)) {
    missingPortalFns.push(fn);
  }
}
console.log('Missing/Undefined in Portal:', missingPortalFns);
