const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const pos = html.indexOf('financeTransactionModal');
const lines = html.slice(0, pos).split('\n');

const stack = [];
const regex = /<(\/)?([a-zA-Z0-9]+)([^>]*)>/g;

for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
    const line = lines[lineNum - 1];
    let m;
    while ((m = regex.exec(line)) !== null) {
        const isClosing = m[1] === '/';
        const tag = m[2].toLowerCase();
        const rest = m[3];
        const isSelfClosing = rest.endsWith('/') || ['meta', 'link', 'img', 'br', 'hr', 'input'].includes(tag);
        
        if (tag === 'script' || tag === 'style') continue;
        if (isSelfClosing) continue;
        
        if (!isClosing) {
            stack.push({ tag, lineNum, line: line.trim() });
        } else {
            stack.pop();
        }
    }
}

console.log('Open elements above financeTransactionModal:');
stack.forEach(s => console.log('Line ' + s.lineNum + ': <' + s.tag + '> ' + s.line.slice(0, 60)));
