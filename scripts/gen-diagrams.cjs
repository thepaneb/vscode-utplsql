#!/usr/bin/env node
// Renderiza todos os SVGs de docs/wiki/images/ para PNG (1200px de largura).
// Usa @resvg/resvg-js (devDependency) — funciona em Windows/Linux sem
// dependências de sistema (não requer librsvg/rsvg-convert).
//
// Uso: npm run gen-diagram

const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const IMAGES_DIR = path.join(__dirname, '..', 'docs', 'wiki', 'images');

const files = fs
  .readdirSync(IMAGES_DIR)
  .filter((f) => f.endsWith('.svg'))
  .sort();

if (files.length === 0) {
  console.error(`Nenhum .svg encontrado em ${IMAGES_DIR}`);
  process.exit(1);
}

let failures = 0;
for (const file of files) {
  const svgPath = path.join(IMAGES_DIR, file);
  const pngPath = svgPath.replace(/\.svg$/, '.png');
  try {
    const svg = fs.readFileSync(svgPath, 'utf8');
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
    const png = resvg.render().asPng();
    fs.writeFileSync(pngPath, png);
    console.log(`${file} → ${path.basename(pngPath)} OK (${png.length} bytes)`);
  } catch (e) {
    failures++;
    console.error(`${file} FALHOU: ${e.message}`);
  }
}

process.exit(failures > 0 ? 1 : 0);
