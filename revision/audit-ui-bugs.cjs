const fs = require('fs');

console.log('--- Scanning for Potential UI/UX and Functional Issues ---');

// 1. Check all files for CSS overflow bugs (like flex children without min-width: 0 or width without box-sizing)
const styles = fs.readFileSync('styles.css', 'utf8');

// 2. Check for missing elements or broken querySelectors in app.js
const appJs = fs.readFileSync('app.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

// Find all document.getElementById('...') in app.js
const idMatches = [...appJs.matchAll(/document\.getElementById\(['"]([a-zA-Z0-9_-]+)['"]\)/g)];
const usedIds = new Set(idMatches.map(m => m[1]));

const missingIds = [];
usedIds.forEach(id => {
  // Check if id exists in index.html or is dynamically created
  if (!indexHtml.includes(`id="${id}"`) && !indexHtml.includes(`id='${id}'`)) {
    // Check if created dynamically in app.js or other js
    if (!appJs.includes(`id = '${id}'`) && !appJs.includes(`id="${id}"`) && !appJs.includes(`id=\\"${id}\\"`)) {
      missingIds.push(id);
    }
  }
});

console.log(`Used IDs in app.js: ${usedIds.size}`);
console.log(`Potentially missing static/dynamic IDs in index.html:`, missingIds);
