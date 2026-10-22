// Stage 4: routing / views / nav wiring
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'revision', '_fe-out');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const idx = read('index.html');
const app = read('app.js');
const appLines = app.split('\n');

const views = [...idx.matchAll(/data-view="([^"]+)"/g)].map((m) => m[1]);
const uniqViews = [...new Set(views)];
console.log('data-view unique:', JSON.stringify(uniqViews), 'total occurrences:', views.length);

// where does data-view live (on what element)?
views.forEach(() => {});
for (const m of idx.matchAll(/<[^>]*data-view="([^"]+)"[^>]*>/g)) {
  const line = idx.slice(0, m.index).split('\n').length;
  const tag = m[0].match(/^<(\w+)/)?.[1];
  const cls = m[0].match(/class="([^"]*)"/)?.[1];
  const id = m[0].match(/id="([^"]*)"/)?.[1];
  console.log(`  L${line} <${tag}> view=${m[1]} class="${cls || ''}" id="${id || ''}"`);
}

// switchView implementation
const swIdx = appLines.findIndex((l) => /function switchView\s*\(/.test(l));
console.log('\nswitchView at app.js:' + (swIdx + 1));
console.log(appLines.slice(swIdx, swIdx + 60).map((l, i) => (swIdx + 1 + i) + ': ' + l).join('\n'));

// navigate / data-view listeners
console.log('\n--- data-view references in JS ---');
for (const [f, src] of [['app.js', app]]) {
  src.split('\n').forEach((l, i) => {
    if (/data-view|dataset\.view|switchView\(/.test(l)) console.log(`${f}:${i + 1}: ${l.trim().slice(0, 150)}`);
  });
}
