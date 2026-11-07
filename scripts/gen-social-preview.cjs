// Gera images/social-preview.png (1280x640) a partir de images/social-preview.svg.
// O PNG é o que se envia em GitHub → Settings → General → Social preview.
// Requer @resvg/resvg-js (instale com: npm install --no-save @resvg/resvg-js).
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'images', 'social-preview.svg');
const target = path.join(root, 'images', 'social-preview.png');
const svg = fs.readFileSync(source);

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1280 },
  font: { loadSystemFonts: true },
});
const png = resvg.render().asPng();
fs.writeFileSync(target, png);

console.log('social-preview.png gerado:', png.length, 'bytes (1280x640)');
