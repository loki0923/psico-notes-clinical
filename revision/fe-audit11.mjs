// Stage 11: CSS class presence + z-index ordering for modals/drawer/toast
import fs from 'node:fs';
const ROOT = process.cwd();
const read = (f) => fs.readFileSync(`${ROOT}/${f}`, 'utf8');
const css = read('styles.css') + '\n' + read('portal.css');

const has = (sel) => new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') ).test(css);

const classes = ['btn-danger', 'recording', 'screen-locked', 'has-active-modal', 'toast', 'toast-container',
  'toastContainer', 'modal', 'modal-overlay', 'modal-content', 'modal-large', 'modal-header', 'modal-body',
  'sidebar', 'sidebar-backdrop', 'drawer', 'ai-analysis-card', 'empty-state', 'alert-box', 'error',
  'clinical-alert', 'timeline', 'timeline-item', 'timeline-tag', 'patient-status-chip', 'referral-chip',
  'mobile-bottom-nav', 'mobile-nav-item', 'nav-item', 'view', 'active', 'open', 'collapsed',
  'wellbeing-ring', 'sync-text', 'btn-sync-cloud', 'session-reminder-drawer', 'search-results',
  'ai-bubble', 'form-group', 'btn-secondary', 'btn-primary', 'btn-icon', 'btn-sm', 'full-width'];
console.log('=== class selectors used by JS vs styles.css ===');
const missing = [];
for (const c of classes) {
  const ok = has('.' + c);
  if (!ok) missing.push(c);
  console.log(`  .${c}`.padEnd(32), ok ? 'FOUND' : '*** MISSING ***');
}

// z-index audit
console.log('\n=== z-index declarations ===');
const zs = [...css.matchAll(/([^{}]+)\{([^{}]*z-index\s*:\s*(\d+)[^{}]*)\}/g)].map((m) => ({ sel: m[1].trim().replace(/\s+/g, ' ').slice(0, 70), z: Number(m[3]) }));
const grouped = new Map();
for (const z of zs) { if (!grouped.has(z.z)) grouped.set(z.z, []); grouped.get(z.z).push(z.sel); }
for (const z of [...grouped.keys()].sort((a, b) => a - b)) console.log(`  z=${String(z).padEnd(6)} ${grouped.get(z).join(' | ').slice(0, 160)}`);
console.log('  total z-index rules:', zs.length);

// modal / drawer / toast specific
const pick = (re) => zs.filter((z) => re.test(z.sel));
console.log('\n  .modal.active    :', JSON.stringify(pick(/\.modal\b/)));
console.log('  sidebar/drawer   :', JSON.stringify(pick(/sidebar|drawer/)));
console.log('  toast            :', JSON.stringify(pick(/toast/)));
console.log('  screen-locked    :', JSON.stringify(pick(/screen-lock|screenLock/)));

// responsive breakpoints
const media = [...css.matchAll(/@media[^{]+/g)].map((m) => m[0].trim());
const bps = new Set(media);
console.log('\n=== @media queries ===', media.length);
console.log([...bps].join('\n'));

// !important count (maintainability signal)
console.log('\n!important count:', (css.match(/!important/g) || []).length);
console.log('styles.css lines:', read('styles.css').split('\n').length, ' portal.css lines:', read('portal.css').split('\n').length);
fs.writeFileSync(`${ROOT}/revision/_fe-out/css.json`, JSON.stringify({ missing, zs }, null, 1));
