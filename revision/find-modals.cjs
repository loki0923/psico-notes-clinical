const fs = require('fs');
const h = fs.readFileSync('portal.html', 'utf8');
const regex = /id="([^"]*Modal[^"]*)"/gi;
let m;
while ((m = regex.exec(h)) !== null) {
  console.log(m[1]);
}
