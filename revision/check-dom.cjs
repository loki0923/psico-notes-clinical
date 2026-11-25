const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
const targetLine = lines.findIndex(l => l.includes('financeTransactionModal'));
console.log('financeTransactionModal is at line:', targetLine + 1);

let depth = 0;
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const opens = (l.match(/<div[\s>]/g) || []).length;
    const closes = (l.match(/<\/div>/g) || []).length;
    depth += (opens - closes);
    if (i >= targetLine - 20 && i <= targetLine + 70) {
        console.log((i+1).toString().padStart(4) + ' (d=' + depth + '): ' + l);
    }
}
