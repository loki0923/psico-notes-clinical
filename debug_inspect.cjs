const fs = require('fs');

// Read index.html
const html = fs.readFileSync('index.html', 'utf8');

// Mock browser environment
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

global.window = global;
global.window.location = {
  origin: 'https://psico-notes-clinical.onrender.com',
  pathname: '/',
  href: 'https://psico-notes-clinical.onrender.com/'
};
global.window.addEventListener = (event, fn) => {
  if (event === 'DOMContentLoaded') {
    global.window._domContentLoaded = fn;
  }
};
global.navigator = { 
  userAgent: 'NodeTest', 
  serviceWorker: { register: () => Promise.resolve() },
  clipboard: { writeText: () => Promise.resolve() }
};

// Mock elements store
const elements = {};
function createMockEl(id = '', tag = 'div') {
  return {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    innerHTML: '',
    textContent: '',
    style: {},
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); },
      toggle: function(c) { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); }
    },
    addEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    reset: () => {},
    querySelectorAll: () => [],
    querySelector: () => null
  };
}

global.document = {
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = createMockEl(id);
    }
    return elements[id];
  },
  createElement: (tag) => createMockEl('', tag),
  body: createMockEl('body', 'body'),
  querySelectorAll: (selector) => {
    return [createMockEl('mock_' + selector)];
  },
  querySelector: (selector) => {
    return createMockEl('mock_' + selector);
  },
  addEventListener: (event, fn) => {
    if (event === 'DOMContentLoaded') {
      global.window._domContentLoaded = fn;
    }
  }
};

const scripts = [
  'phi-anonymizer.js',
  'voice-dictation.js',
  'ai-clinical.js',
  'psychoed.js',
  'reports.js',
  'vademecum.js',
  'app.js',
  'scales.js',
  'finance.js',
  'adm.js',
  'session-reminders.js',
  'backup.js',
  'crisis-protocol.js',
  'consentimiento.js',
  'historia-clinica.js'
];

console.log('--- 1. CARGA DE SCRIPTS ---');
scripts.forEach(script => {
  try {
    const code = fs.readFileSync(script, 'utf8');
    const fn = new Function(code);
    fn.call(global.window);
    console.log('✅ Cargado con éxito:', script);
  } catch (err) {
    console.error('❌ ERROR AL CARGAR ' + script + ':', err);
  }
});

console.log('\n--- 2. AUDITORÍA DE ONCLICK EN index.html ---');
const onclickRegex = /onclick="([^"]+)"/g;
let match;
const onclickCalls = new Set();
while ((match = onclickRegex.exec(html)) !== null) {
  const code = match[1].trim();
  // Extract function name, e.g. openRatesManagementModal(), closeModal('patientModal')
  const fnMatch = code.match(/^([a-zA-Z0-9_$.]+)\s*\(/);
  if (fnMatch) {
    onclickCalls.add(fnMatch[1]);
  }
}

console.log(`Encontrados ${onclickCalls.size} manejadores de eventos onclick únicos:`);
onclickCalls.forEach(fnPath => {
  const parts = fnPath.split('.');
  let curr = global.window;
  let exists = true;
  for (const p of parts) {
    if (curr && typeof curr[p] !== 'undefined') {
      curr = curr[p];
    } else {
      exists = false;
      break;
    }
  }
  if (!exists) {
    console.error(`❌ FUNCIÓN ONCLICK NO ENCONTRADA EN WINDOW: ${fnPath}`);
  } else {
    console.log(`  ✅ ${fnPath} está disponible (${typeof curr})`);
  }
});

console.log('\n--- 3. VERIFICACIÓN DE BOTONES CLAVE REPORTADOS ---');
console.log('a) openRatesManagementModal():');
try {
  global.window.openRatesManagementModal();
  console.log('   ✅ openRatesManagementModal() se ejecutó sin errores');
} catch (e) {
  console.error('   ❌ ERROR en openRatesManagementModal():', e.message);
}

console.log('b) openMonthlyGoalsModal():');
try {
  global.window.openMonthlyGoalsModal();
  console.log('   ✅ openMonthlyGoalsModal() se ejecutó sin errores');
} catch (e) {
  console.error('   ❌ ERROR en openMonthlyGoalsModal():', e.message);
}

console.log('c) switchView vs navigateTo:');
if (typeof global.window.switchView === 'function') {
  console.log('   ✅ window.switchView está definido');
} else {
  console.error('   ❌ window.switchView NO está definido');
}

console.log('d) launchPatientPortal:');
if (typeof global.window.launchPatientPortal === 'function') {
  console.log('   ✅ window.launchPatientPortal está definido');
} else {
  console.error('   ❌ window.launchPatientPortal NO está definido');
}

console.log('e) openScaleModal / openCreateCustomScaleModal:');
if (typeof global.window.openScaleModal === 'function') {
  console.log('   ✅ window.openScaleModal está definido');
} else {
  console.log('   ℹ️ window.openScaleModal:', typeof global.window.openScaleModal);
}
if (typeof global.window.openScaleEditorModal === 'function') {
  console.log('   ✅ window.openScaleEditorModal está definido');
} else {
  console.log('   ℹ️ window.openScaleEditorModal:', typeof global.window.openScaleEditorModal);
}

console.log('\n--- AUDITORÍA FINALIZADA ---');
process.exit(0);
