// Stage 12: buttons/links in index.html with no id, no onclick, no data-view, not type=submit,
// and not matched by any JS querySelector -> permanently dead UI
import fs from 'node:fs';
const ROOT = process.cwd();
const read = (f) => fs.readFileSync(`${ROOT}/${f}`, 'utf8');
const html = read('index.html');
const js = ['phi-anonymizer.js', 'voice-dictation.js', 'ai-clinical.js', 'psychoed.js', 'reports.js', 'vademecum.js', 'app.js', 'scales.js', 'finance.js', 'adm.js', 'session-reminders.js', 'backup.js', 'crisis-protocol.js', 'consentimiento.js', 'historia-clinica.js'].map(read).join('\n');
const lineOf = (s, i) => s.slice(0, i).split('\n').length;

// collect all selectors JS queries
const selectors = new Set();
for (const m of js.matchAll(/querySelector(?:All)?\s*\(\s*(['"])(.+?)\1/g)) selectors.add(m[2]);
for (const m of js.matchAll(/getElementById\s*\(\s*(['"])(.+?)\1/g)) selectors.add('#' + m[2]);
const jsClassRefs = new Set();
for (const s of selectors) for (const m of s.matchAll(/\.([A-Za-z][\w-]*)/g)) jsClassRefs.add(m[1]);
for (const m of js.matchAll(/classList\.(?:add|toggle|remove|contains)\(\s*['"]([^'"]+)['"]/g)) jsClassRefs.add(m[1]);
for (const m of js.matchAll(/['"]\.([a-z][\w-]*)['"]/g)) jsClassRefs.add(m[1]);

// all buttons / role=button anchors in index.html
const dead = [];
for (const m of html.matchAll(/<(button|a)\b([^>]*)>/g)) {
  const attrs = m[2];
  const line = lineOf(html, m.index);
  if (/\bonclick\b/.test(attrs)) continue;
  if (/\btype\s*=\s*["']submit["']/.test(attrs)) continue;
  if (/data-view|data-tab|data-action/.test(attrs)) continue;
  const id = attrs.match(/\bid\s*=\s*["']([^"']+)["']/)?.[1];
  const cls = attrs.match(/\bclass\s*=\s*["']([^"']*)["']/)?.[1] || '';
  if (id && selectors.has('#' + id)) continue;
  // if JS binds by any of its classes, assume wired
  const clsList = cls.split(/\s+/).filter(Boolean);
  if (clsList.some((c) => jsClassRefs.has(c))) continue;
  if (m[1] === 'a' && /href\s*=\s*["'](https?:|mailto:|tel:|#)/.test(attrs)) continue;
  dead.push({ line, tag: m[1], id: id || '', cls, text: html.slice(m.index + m[0].length, m.index + m[0].length + 70).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) });
}

console.log('=== <button>/<a> in index.html with NO handler, NO id, NO wired class ===');
console.log('count:', dead.length);
for (const d of dead) console.log(`  L${String(d.line).padEnd(5)} <${d.tag}> id="${d.id}" class="${d.cls.slice(0, 46)}" text="${d.text}"`);

// same for inputs/selects with onchange but no id
console.log('\n=== elements with onchange/oninput but no id (cannot be read by JS) ===');
for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
  const a = m[2];
  if (!/\bon(change|input)\b/.test(a)) continue;
  if (/\bid\s*=/.test(a)) continue;
  console.log(`  L${lineOf(html, m.index)}: ${m[0].replace(/\s+/g, ' ').slice(0, 130)}`);
}
