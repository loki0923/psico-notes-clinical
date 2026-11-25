const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const regex = /on[a-z]+="([^"]*if[^"]*)"/g;
let m;
while ((m = regex.exec(h)) !== null) {
  console.log(m[0]);
}
