const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/Windows 11/.gemini/antigravity/brain/10cc1380-b0aa-4975-ba1d-1542df75f1ea/.user_uploaded/media_1793123607154_3065d795.jpg';
const imgBuf = fs.readFileSync(srcPath);
const base64Data = imgBuf.toString('base64');
const dataUri = 'data:image/jpeg;base64,' + base64Data;

// Copiar archivos JPG directos
fs.writeFileSync('assets/avatar/serena-avatar.jpg', imgBuf);
fs.writeFileSync('assets/avatar/serena-avatar-main.jpg', imgBuf);
fs.writeFileSync('assets/avatar/serena-avatar-welcome.jpg', imgBuf);
fs.writeFileSync('assets/avatar/serena-avatar-header.jpg', imgBuf);
fs.writeFileSync('assets/avatar/serena-avatar-badge.jpg', imgBuf);

// Generar wrappers SVG con clipPath circular para escalabilidad perfecta
function makeSvg(size, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%" fill="none" role="img" aria-label="${title}">
  <title>${title}</title>
  <defs>
    <clipPath id="serenaClip_${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" />
    </clipPath>
  </defs>
  <g clip-path="url(#serenaClip_${size})">
    <image href="${dataUri}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" />
  </g>
</svg>`;
}

fs.writeFileSync('assets/avatar/serena-avatar-main.svg', makeSvg(200, 'Serena — Avatar Oficial'));
fs.writeFileSync('assets/avatar/serena-avatar-header.svg', makeSvg(100, 'Serena — Avatar Header'));
fs.writeFileSync('assets/avatar/serena-avatar-welcome.svg', makeSvg(240, 'Serena — Avatar Bienvenida'));
fs.writeFileSync('assets/avatar/serena-avatar-badge.svg', makeSvg(48, 'Serena — Avatar Badge'));

console.log('Successfully updated all Serena avatar files with the uploaded character!');
