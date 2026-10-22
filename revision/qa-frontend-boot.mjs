#!/usr/bin/env node
/**
 * QA-01 · Arranque del frontend SIN navegador (best effort)
 * ---------------------------------------------------------
 * Carga los 15 scripts clásicos de index.html en un contexto `vm` con un DOM
 * mínimo tolerante (Proxy), dispara DOMContentLoaded y reporta:
 *   - errores de parseo/ejecución en top-level (ReferenceError / SyntaxError)
 *   - errores durante el arranque (DOMContentLoaded → showAuthScreen)
 *   - errores durante el arranque con sesión iniciada (startAppForCurrentUser)
 *   - símbolos globales declarados por cada módulo y ausentes al final
 *
 * NO es un navegador: no valida layout, CSS, EventTarget real ni APIs de
 * plataforma. Los errores de "elemento null" no aparecen porque el DOM es un
 * Proxy tolerante; sí aparecen los ReferenceError (globals inexistentes),
 * que es lo que este arnés busca.
 *
 * Uso: node revision\qa-frontend-boot.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\s+src="([^"]+\.js)(?:\?[^"]*)?"\s*><\/script>/g)].map(m => m[1]);
const localScripts = scripts.filter(s => !/^https?:/.test(s));

// ---------- DOM mínimo tolerante ----------
const listeners = [];
let currentFile = '<none>';
let timerQueue = [];

function makeEl() {
  const target = function () { return el; };
  const el = new Proxy(target, {
    get(t, prop) {
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === Symbol.iterator) return function* () { };
      if (prop === 'then') return undefined;
      if (prop === 'length') return 0;
      if (prop === 'value' || prop === 'textContent' || prop === 'innerHTML' || prop === 'id' || prop === 'className' || prop === 'href' || prop === 'src') return '';
      if (prop === 'checked' || prop === 'disabled') return false;
      if (prop === 'children' || prop === 'childNodes' || prop === 'files') return [];
      if (prop === 'dataset' || prop === 'style' || prop === 'classList') return el;
      if (prop === 'addEventListener') return (type, cb) => { listeners.push({ type, cb, file: currentFile }); };
      if (prop === 'removeEventListener') return () => { };
      if (prop === 'querySelectorAll') return () => [];
      if (prop === 'querySelector') return () => el;
      if (prop === 'closest') return () => el;
      if (prop === 'getBoundingClientRect') return () => ({ top: 0, left: 0, width: 100, height: 100, bottom: 100, right: 100 });
      if (prop === 'insertAdjacentHTML' || prop === 'appendChild' || prop === 'removeChild' || prop === 'setAttribute' || prop === 'removeAttribute' || prop === 'focus' || prop === 'blur' || prop === 'click' || prop === 'remove' || prop === 'play' || prop === 'pause' || prop === 'scrollIntoView') return () => { };
      if (prop === 'getAttribute') return () => '';
      return el;
    },
    set() { return true; },
    apply() { return el; },
    construct() { return el; }
  });
  return el;
}
const el = makeEl();

const storage = () => {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: k => { m.delete(k); },
    clear: () => m.clear(),
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _map: m
  };
};

const parseError = (e) => {
  const msg = String(e && e.message || e);
  const id = (msg.match(/^([A-Za-z_$][\w$]*) is not defined/) || [])[1] || null;
  return { name: e?.name || 'Error', message: msg.slice(0, 300), identifier: id, stack: String(e?.stack || '').split('\n').slice(0, 4).join('\n') };
};

function buildContext(localStorageImpl) {
  const doc = new Proxy({
    getElementById: () => el,
    querySelector: () => el,
    querySelectorAll: () => [],
    createElement: () => el,
    createTextNode: () => el,
    createDocumentFragment: () => el,
    addEventListener: (type, cb) => { listeners.push({ type, cb, file: currentFile }); },
    removeEventListener: () => { },
    documentElement: el,
    body: el,
    head: el,
    cookie: '',
    readyState: 'complete',
    hidden: false,
    visibilityState: 'visible',
    title: 'QA'
  }, { get(t, p) { return p in t ? t[p] : el; }, set() { return true; } });

  const sandbox = {
    console: {
      log: (...a) => { if (process.env.QA_VERBOSE) console.log('[app]', ...a); },
      warn: (...a) => { if (process.env.QA_VERBOSE) console.warn('[app]', ...a); },
      error: (...a) => { if (process.env.QA_VERBOSE) console.error('[app]', ...a); },
      info: () => { }, debug: () => { }, table: () => { }
    },
    document: doc,
    navigator: { onLine: true, userAgent: 'QA-Node', language: 'es-VE', clipboard: { writeText: async () => { } }, mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) }, serviceWorker: { register: async () => ({}) } },
    location: { href: 'http://127.0.0.1:4220/index.html', origin: 'http://127.0.0.1:4220', hostname: '127.0.0.1', port: '4220', protocol: 'http:', pathname: '/index.html', search: '', hash: '', reload: () => { }, assign: () => { } },
    localStorage: localStorageImpl,
    sessionStorage: storage(),
    setTimeout: (fn, ms) => { timerQueue.push({ fn, ms: ms || 0 }); return timerQueue.length; },
    setInterval: () => 1,
    clearInterval: () => { },
    clearTimeout: () => { },
    requestAnimationFrame: (fn) => { timerQueue.push({ fn, ms: 0 }); return 1; },
    cancelAnimationFrame: () => { },
    queueMicrotask: (fn) => Promise.resolve().then(fn),
    matchMedia: () => ({ matches: false, addEventListener: () => { }, removeEventListener: () => { }, addListener: () => { } }),
    alert: () => { }, confirm: () => true, prompt: () => '',
    crypto: globalThis.crypto,
    btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
    atob: (s) => Buffer.from(String(s), 'base64').toString('binary'),
    TextEncoder, TextDecoder, URL, URLSearchParams, Blob, FormData, Headers, Request, Response,
    fetch: async () => ({ ok: false, status: 0, headers: new Map(), json: async () => ({}), text: async () => '', clone() { return this; } }),
    AbortController,
    Notification: class { static permission = 'denied'; static requestPermission = async () => 'denied'; constructor() { } },
    FileReader: class { readAsDataURL() { } readAsText() { } },
    IntersectionObserver: class { observe() { } unobserve() { } disconnect() { } },
    ResizeObserver: class { observe() { } unobserve() { } disconnect() { } },
    Chart: class { constructor() { } destroy() { } update() { } },
    jsPDF: class { constructor() { } text() { } save() { } addPage() { } setFontSize() { } },
    XLSX: { utils: { book_new: () => ({}), json_to_sheet: () => ({}), book_append_sheet: () => { }, sheet_to_json: () => [] }, writeFile: () => { } },
    SpeechRecognition: class { start() { } stop() { } },
    webkitSpeechRecognition: class { start() { } stop() { } },
    speechSynthesis: { speak: () => { }, cancel: () => { }, getVoices: () => [] },
    Audio: class { play() { } pause() { } },
    performance: { now: () => Date.now() },
    scrollTo: () => { },
    open: () => ({ document: { write: () => { }, close: () => { } }, focus: () => { }, print: () => { }, close: () => { } }),
    print: () => { },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    addEventListener: (type, cb) => { listeners.push({ type, cb, file: currentFile }); },
    removeEventListener: () => { },
    dispatchEvent: () => true,
    Event: class { constructor(t) { this.type = t; } },
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o?.detail; } },
    MutationObserver: class { observe() { } disconnect() { } }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.top = sandbox;
  sandbox.parent = sandbox;
  return vm.createContext(sandbox, { name: 'qa-frontend' });
}

// ---------- Símbolos declarados por módulo ----------
function topLevelSymbols(src) {
  const out = new Set();
  for (const m of src.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^class\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^window\.([A-Za-z_$][\w$]*)\s*=/gm)) out.add(m[1]);
  return [...out].filter(s => !/^on[a-z]/.test(s));
}

// Nombres reales expuestos por los módulos (verificados por grep en cada archivo)
const MISSION_GLOBALS = ['AppState', 'showToast', 'openModal', 'closeModal', 'ClinicalAI', 'PhiAnonymizer',
  'CloudSyncManager', 'saveData', 'loadData', 'renderPatients', 'updateDashboard',
  'PsychoEd', 'ClinicalReports', 'ClinicalHistorySystem', 'Vademecum', 'VoiceDictation',
  'ReminderState', 'CrisisEmergencyDirectory', 'EXTENDED_CLINICAL_SCALES'];

// Llamadas representativas de cada módulo: solo se reporta ReferenceError (global ausente)
const SWEEP = [
  ['renderScalesView()', 'scales.renderScalesView'],
  ['getAllClinicalScales().length', 'scales.getAllClinicalScales'],
  ['openInteractiveScaleModal("phq9")', 'scales.openInteractiveScaleModal'],
  ['getFinanceTransactions()', 'finance.getFinanceTransactions'],
  ['getBillingConfig()', 'adm.getBillingConfig'],
  ['evaluateSessionReminders()', 'reminders.evaluateSessionReminders'],
  ['openBackupModal()', 'backup.openBackupModal'],
  ['showCrisisProtocol({name:"QA"}, "QA")', 'crisis.showCrisisProtocol'],
  ['openInformedConsentModal("qa01_fake")', 'consentimiento.openInformedConsentModal'],
  ['ClinicalAI.simulateSoapSynthesis("Paciente con ansiedad")', 'aiClinical.simulateSoapSynthesis'],
  ['PhiAnonymizer.anonymize("Juan Perez, tel 0414-1234567", {name:"Juan Perez"})', 'phi.anonymize'],
  ['Vademecum.search ? Vademecum.search("sertralina") : 0', 'vademecum.search'],
  ['VoiceDictation.start ? VoiceDictation.start("x") : 0', 'voice.start'],
  ['ClinicalHistorySystem.render ? ClinicalHistorySystem.render("p") : 0', 'historia.render'],
  ['PsychoEd.open ? PsychoEd.open("ansiedad") : 0', 'psychoed.open'],
  ['AppState.patients.length', 'appstate.patients']
];

// ---------- Ejecución ----------
const report = { generatedAt: new Date().toISOString(), scripts: localScripts, loadErrors: [], init: {}, symbols: {}, order: [] };

async function runPass(label, seedSession) {
  listeners.length = 0;
  timerQueue = [];
  const ctx = buildContext(seedSession ? storage() : storage());
  if (seedSession) {
    ctx.localStorage.setItem('psico_session', 'qa_user_1');
  }
  const res = { label, loadErrors: [], asyncErrors: [], initError: null, listeners: 0, timersRun: 0 };

  const unhandled = [];
  const onUnhandled = (e) => unhandled.push(parseError(e));
  process.on('unhandledRejection', onUnhandled);

  for (const f of localScripts) {
    currentFile = f;
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    try {
      vm.runInContext(src, ctx, { filename: f, timeout: 20000 });
    } catch (e) {
      res.loadErrors.push({ file: f, ...parseError(e) });
    }
  }

  // Símbolos esperados
  if (!seedSession) {
    for (const f of localScripts) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const missing = [];
      for (const sym of topLevelSymbols(src)) {
        try {
          const t = vm.runInContext(`typeof ${sym}`, ctx);
          if (t === 'undefined') missing.push(sym);
        } catch { missing.push(sym); }
      }
      report.symbols[f] = missing;
    }
    const absent = [];
    for (const g of MISSION_GLOBALS) {
      let t = 'undefined';
      try { t = vm.runInContext(`typeof ${g}`, ctx); } catch { }
      if (t === 'undefined') absent.push(g);
    }
    report.missionGlobalsAbsent = absent;
  }

  const dcl = listeners.filter(l => l.type === 'DOMContentLoaded');
  res.listeners = dcl.length;

  // Disparo de DOMContentLoaded (await de cada handler)
  for (const l of dcl) {
    currentFile = l.file;
    try {
      const out = l.cb({ type: 'DOMContentLoaded' });
      if (out && typeof out.then === 'function') {
        await Promise.race([out, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout init 4s')), 4000))]);
      }
    } catch (e) {
      res.initError = res.initError || { file: l.file, ...parseError(e) };
    }
    // flush de timers de cortesía (máx 100)
    let n = 0;
    while (timerQueue.length && n < 100) {
      const t = timerQueue.shift();
      n++;
      try {
        const o = t.fn();
        if (o && typeof o.then === 'function') await Promise.race([o, new Promise(r => setTimeout(r, 200))]);
      } catch (e) {
        res.asyncErrors.push({ file: l.file, ...parseError(e) });
      }
    }
    res.timersRun += n;
  }
  // Barrido de funciones reales de cada módulo: detecta globals ausentes en rutas profundas
  res.sweepErrors = [];
  res.sweepOk = 0;
  for (const [expr, label] of SWEEP) {
    currentFile = label;
    try {
      const out = vm.runInContext(expr, ctx, { filename: `sweep:${label}`, timeout: 5000 });
      if (out && typeof out.then === 'function') {
        await Promise.race([out, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout sweep')), 2000))]);
      }
      res.sweepOk++;
    } catch (e) {
      if (/is not defined/.test(String(e.message))) {
        res.sweepErrors.push({ label, ...parseError(e) });
      }
    }
  }

  await new Promise(r => setTimeout(r, 500));
  process.off('unhandledRejection', onUnhandled);
  res.unhandled = unhandled.slice(0, 10);

  report.init[label] = res;
  return res;
}

console.log('=== QA-01 · Arranque del frontend (vm + DOM Proxy) ===');
console.log(`scripts en index.html (${localScripts.length}): ${localScripts.join(', ')}`);

await runPass('anonimo', false);
await runPass('conSesion', true);

const show = (res) => {
  console.log(`\n── Pase: ${res.label} ──`);
  console.log(`  top-level: ${res.loadErrors.length} error(es)`);
  for (const e of res.loadErrors) console.log(`    ✗ ${e.file}:${e.name}: ${e.message}${e.identifier ? `  [global ausente: ${e.identifier}]` : ''}`);
  console.log(`  DOMContentLoaded handlers: ${res.listeners}`);
  if (res.initError) console.log(`  ✗ init: ${res.initError.file}: ${res.initError.name}: ${res.initError.message}${res.initError.identifier ? `  [global ausente: ${res.initError.identifier}]` : ''}`);
  else console.log('  init: sin excepción propagada');
  if (res.asyncErrors.length) {
    console.log(`  errores en callbacks/timers: ${res.asyncErrors.length}`);
    const seen = new Set();
    for (const e of res.asyncErrors) {
      const k = e.message.slice(0, 80);
      if (seen.has(k)) continue;
      seen.add(k);
      console.log(`    ✗ ${e.file}: ${e.name}: ${e.message}`);
    }
  }
  if (res.unhandled?.length) console.log(`  promesas rechazadas sin manejar: ${res.unhandled.length}`);
  console.log(`  barrido de funciones de módulos: ${res.sweepOk}/${SWEEP.length} sin ReferenceError`);
  for (const e of res.sweepErrors) console.log(`    ✗ ${e.label}: ${e.name}: ${e.message}${e.identifier ? `  [global ausente: ${e.identifier}]` : ''}`);
};

show(report.init.anonimo);
show(report.init.conSesion);

console.log('\n── Símbolos globales ──');
const absent = report.missionGlobalsAbsent || [];
console.log(`  esperados y ausentes: ${absent.length ? absent.join(', ') : 'ninguno'}`);
const modulesWithMissing = Object.entries(report.symbols).filter(([, v]) => v.length);
if (modulesWithMissing.length) {
  for (const [f, v] of modulesWithMissing) console.log(`  ✗ ${f}: no definió ${v.slice(0, 12).join(', ')}${v.length > 12 ? '…' : ''}`);
} else {
  console.log('  todos los módulos definieron sus símbolos top-level');
}

fs.writeFileSync(path.join(__dirname, 'qa-frontend-boot.json'), JSON.stringify(report, null, 2), 'utf8');
console.log('\nArtefacto: revision\\qa-frontend-boot.json');
const failed = report.init.anonimo.loadErrors.length + report.init.conSesion.loadErrors.length +
  (report.init.anonimo.initError ? 1 : 0) + (report.init.conSesion.initError ? 1 : 0) +
  (report.init.anonimo.sweepErrors || []).length + (report.init.conSesion.sweepErrors || []).length + absent.length;
process.exit(failed ? 1 : 0);
