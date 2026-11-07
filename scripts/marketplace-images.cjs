#!/usr/bin/env node
/**
 * Valida o manifesto de imagens da página do Marketplace (PRD-147).
 *
 * Sem `<!-- marketplace:images-ready -->` no MARKETPLACE.md, apenas informa que
 * a captura está pendente (exit 0). Com o marcador, exige os arquivos, valida
 * PNG 1600×900, tamanho por arquivo/total e referências no MARKETPLACE.md.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const READY_MARKER = '<!-- marketplace:images-ready -->';
const MAX_PNG = 300 * 1024;
const MAX_TOTAL = 2 * 1024 * 1024;
const MAX_GIF = 5 * 1024 * 1024;

const IMAGES = [
  {
    file: 'marketplace-test-explorer.png',
    width: 1600,
    height: 900,
    tolerance: 16,
    required: true,
    alt: 'VS Code Test Explorer showing utPLSQL suites and tests, with Run and Coverage CodeLens in the editor',
  },
  {
    file: 'marketplace-coverage.png',
    width: 1600,
    height: 900,
    tolerance: 16,
    required: true,
    alt: 'PL/SQL editor with line coverage gutters and the Test Coverage panel',
  },
  {
    file: 'marketplace-debugger.png',
    width: 1600,
    height: 900,
    tolerance: 16,
    required: true,
    alt: 'PL/SQL debugger stopped at a breakpoint with variables and call stack',
  },
  {
    file: 'marketplace-failure-diff.png',
    width: 1600,
    height: 900,
    tolerance: 16,
    required: true,
    alt: 'Failing utPLSQL test showing expected versus actual values and inline failure decoration',
  },
  {
    file: 'marketplace-connection-profiles.png',
    width: 1600,
    height: 900,
    tolerance: 16,
    required: false,
    alt: 'Connection profile status bar and profile picker',
  },
];

function pngSize(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const header = Buffer.alloc(24);
    fs.readSync(fd, header, 0, 24, 0);
    if (header.toString('ascii', 1, 4) !== 'PNG') return undefined;
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
  } finally {
    fs.closeSync(fd);
  }
}

function checkMarketplaceImages({
  root = REPO,
  ready,
  manifest = IMAGES,
  sourceDir,
  imagesDir,
} = {}) {
  const repo = root;
  const md = path.join(repo, 'MARKETPLACE.md');
  const problems = [];
  const text = fs.existsSync(md) ? fs.readFileSync(md, 'utf8') : '';
  const isReady = ready ?? text.includes(READY_MARKER);
  if (!isReady) {
    return { ready: false, problems, pending: true };
  }
  if (!text) return { ready: true, problems: ['MARKETPLACE.md ausente'] };

  const src = sourceDir ?? path.join(repo, 'docs', 'brain', '60-README', 'images');
  const dst = imagesDir ?? path.join(repo, 'images');
  let total = 0;
  for (const image of manifest) {
    const target = path.join(src, image.file);
    const mirrored = path.join(dst, image.file);
    if (!fs.existsSync(target)) {
      if (image.required) problems.push(`imagem obrigatória ausente: ${image.file}`);
      continue;
    }
    if (!fs.existsSync(mirrored)) problems.push(`imagem não espelhada em images/: ${image.file}`);
    if (!text.includes(`images/${image.file}`)) {
      problems.push(`MARKETPLACE.md não referencia images/${image.file}`);
    }
    const size = fs.statSync(target).size;
    total += size;
    if (size > MAX_PNG) problems.push(`${image.file}: ${size} bytes > ${MAX_PNG} (300 KB)`);
    const dim = pngSize(target);
    if (!dim) {
      problems.push(`${image.file}: não é um PNG válido`);
    } else {
      const tolerance = image.tolerance ?? 0;
      if (
        Math.abs(dim.width - image.width) > tolerance ||
        Math.abs(dim.height - image.height) > tolerance
      ) {
        problems.push(
          `${image.file}: ${dim.width}×${dim.height} (esperado ${image.width}×${image.height} ±${tolerance})`,
        );
      }
    }
  }
  if (total > MAX_TOTAL) problems.push(`total de imagens ${total} > ${MAX_TOTAL} (2 MB)`);

  const gif = path.join(src, 'marketplace-run.gif');
  if (fs.existsSync(gif) && fs.statSync(gif).size > MAX_GIF) {
    problems.push('marketplace-run.gif > 5 MB');
  }
  return { ready: true, problems, pending: false };
}

function main() {
  const result = checkMarketplaceImages();
  if (result.pending) {
    console.log('MARKETPLACE images: captura pendente (adicione o marcador images-ready).');
    return 0;
  }
  if (result.problems.length) {
    console.log('MARKETPLACE images — problemas:');
    for (const p of result.problems) console.log(`  ✗ ${p}`);
    return 1;
  }
  console.log('OK: imagens do Marketplace válidas.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  IMAGES,
  MAX_PNG,
  MAX_TOTAL,
  MAX_GIF,
  READY_MARKER,
  checkMarketplaceImages,
  pngSize,
};
