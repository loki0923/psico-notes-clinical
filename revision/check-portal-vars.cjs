const fs = require('fs');

const portalCss = fs.readFileSync('portal.css', 'utf8');

const definedVars = new Set();
const varDefRegex = /--([a-zA-Z0-9_-]+)\s*:/g;
let m;
while ((m = varDefRegex.exec(portalCss)) !== null) {
  definedVars.add('--' + m[1]);
}

const filesToCheck = ['portal.js', 'portal.html', 'portal.css'];
const usedUndefined = new Map();

for (const file of filesToCheck) {
  const content = fs.readFileSync(file, 'utf8');
  const useRegex = /var\(\s*(--[a-zA-Z0-9_-]+)/g;
  while ((m = useRegex.exec(content)) !== null) {
    const v = m[1];
    if (!definedVars.has(v)) {
      if (!usedUndefined.has(v)) usedUndefined.set(v, new Set());
      usedUndefined.get(v).add(file);
    }
  }
}

console.log('Undefined CSS variables used in portal:');
for (const [v, files] of usedUndefined.entries()) {
  console.log(`  ${v} in ${Array.from(files).join(', ')}`);
}
