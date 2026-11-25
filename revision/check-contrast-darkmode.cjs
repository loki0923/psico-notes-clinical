const fs = require('fs');

function checkFile(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, idx) => {
    // Check for hardcoded styles that might cause dark-mode issues
    const matchBg = line.match(/style="[^"]*background(-color)?:\s*(white|#fff|#ffffff)[^"]*"/i);
    const matchCol = line.match(/style="[^"]*color:\s*(black|#000|#000000|#111|#222|#333)[^"]*"/i);
    if (matchBg || matchCol) {
      issues.push({ line: idx + 1, text: line.trim() });
    }
  });

  return issues;
}

console.log('--- Checking index.html ---');
const indexIssues = checkFile('index.html');
console.log(`Found ${indexIssues.length} hardcoded color lines in index.html`);
indexIssues.slice(0, 15).forEach(i => console.log(`L${i.line}: ${i.text}`));

console.log('\n--- Checking portal.html ---');
const portalIssues = checkFile('portal.html');
console.log(`Found ${portalIssues.length} hardcoded color lines in portal.html`);
portalIssues.slice(0, 15).forEach(i => console.log(`L${i.line}: ${i.text}`));
