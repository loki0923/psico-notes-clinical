const fs = require('fs');

const stylesCss = fs.readFileSync('styles.css', 'utf8');
const portalCss = fs.readFileSync('portal.css', 'utf8');

// Extract all defined variables from :root and [data-theme="dark"]
const definedVars = new Set();
const varDefRegex = /--([a-zA-Z0-9_-]+)\s*:/g;
let m;
while ((m = varDefRegex.exec(stylesCss)) !== null) {
  definedVars.add('--' + m[1]);
}

const filesToCheck = ['app.js', 'index.html', 'styles.css', 'finance.js', 'historia-clinica.js'];
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

console.log('Undefined CSS variables used in therapist app:');
for (const [v, files] of usedUndefined.entries()) {
  console.log(`  ${v} in ${Array.from(files).join(', ')}`);
}
