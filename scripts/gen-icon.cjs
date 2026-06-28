// Gera images/icon.png (128x128) a partir de images/icon.svg.
// Requer @resvg/resvg-js (instale com: npm install --no-save @resvg/resvg-js).
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const root = path.resolve(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'images', 'icon.svg'));

const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 128 } });
const png = resvg.render().asPng();
fs.writeFileSync(path.join(root, 'images', 'icon.png'), png);

console.log('icon.png gerado:', png.length, 'bytes');
