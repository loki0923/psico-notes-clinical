const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = 'id="noteConfidential"> 🔒 Confidencial / Nota reservada\r\n                </label>';
const altTarget = 'id="noteConfidential"> 🔒 Confidencial / Nota reservada\n                </label>';

let replaced;
if (html.includes(target)) {
    replaced = html.replace(target, target + '\r\n            </div>');
} else if (html.includes(altTarget)) {
    replaced = html.replace(altTarget, altTarget + '\n            </div>');
} else {
    console.log('Target not found');
    process.exit(1);
}

const pos = replaced.indexOf('financeTransactionModal');
const lines = replaced.slice(0, pos).split('\n');

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

console.log('Open elements above financeTransactionModal AFTER adding </div>:');
stack.forEach(s => console.log('Line ' + s.lineNum + ': <' + s.tag + '> ' + s.line.slice(0, 60)));
