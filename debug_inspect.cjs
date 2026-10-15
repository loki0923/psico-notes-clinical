const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find all modals and verify their open/close balance
const modalRegex = /<div class="modal" id="([^"]+)">/g;
let m;
const modals = [];
while ((m = modalRegex.exec(html)) !== null) {
  modals.push({ id: m[1], index: m.index });
}

console.log('Found ' + modals.length + ' modals');
for (let i = 0; i < modals.length; i++) {
  const current = modals[i];
  const nextIdx = (i + 1 < modals.length) ? modals[i+1].index : html.indexOf('id="screenLockOverlay"');
  const chunk = html.substring(current.index, nextIdx);
  
  // count divs in this chunk
  const openCount = (chunk.match(/<div[\s>]/g) || []).length;
  const closeCount = (chunk.match(/<\/div>/g) || []).length;
  if (openCount !== closeCount) {
    console.log(`MISMATCH in modal #${current.id}: open=${openCount}, close=${closeCount} (diff=${openCount - closeCount})`);
  } else {
    console.log(`OK modal #${current.id}`);
  }
}
