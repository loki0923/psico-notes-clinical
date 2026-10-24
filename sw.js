const CACHE_VERSION = 'psico-v7.0.0';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './historia-clinica.js',
  './scales.js',
  './voice-dictation.js',
  './session-recorder.js',
  './phi-anonymizer.js',
  './session-reminders.js',
  './ai-clinical.js',
  './psychoed.js',
  './reports.js',
  './vademecum.js',
  './finance.js',
  './adm.js',
  './backup.js',
  './crisis-protocol.js',
  './consentimiento.js',
  './portal.html',
  './portal.css',
  './portal.js',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Install: precachear assets críticos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: limpiar cachés viejas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: estrategia Network-First con fallback a Caché para reflejar de inmediato actualizaciones
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  
  const url = new URL(e.request.url);

  // Evitar esquemas no HTTP (ej: chrome-extension, moz-extension, blob, data)
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // NUNCA cachear llamadas a la API para evitar fugas de datos de salud (PHI) o respuestas obsoletas
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request).then((response) => {
      if (response && response.ok && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(e.request, clone));
      }
      return response;
    }).catch(() => caches.match(e.request))
  );
});
