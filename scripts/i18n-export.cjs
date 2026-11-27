#!/usr/bin/env node
/**
 * Exporta os catálogos de locale para JSON (PRD-93).
 *
 * Fonte: catálogos compilados em `out/i18n/locales/index.js` (rode
 * `npm run compile` antes — o script npm `i18n:export` já faz isso).
 * `en-gb` é exportado como overlay (`base: "en"` + overrides), preservando o
 * formato do catálogo.
 *
 * Uso:
 *   node scripts/i18n-export.cjs [--out <dir>] [--root <dir>]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LOCALES } = require('./i18n-locale-meta.cjs');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT = path.join(ROOT, 'i18n-export');

function loadCompiled(root = ROOT) {
  const file = path.join(root, 'out', 'i18n', 'locales', 'index.js');
  if (!fs.existsSync(file)) {
    throw new Error('out/i18n/locales/index.js ausente; rode "npm run compile"');
  }
  return require(file);
}

/** Overrides do overlay en-gb (`{ ...en, ...overrides }`) a partir da fonte. */
function readEnGbOverrides(root = ROOT) {
  const file = path.join(root, 'src', 'i18n', 'locales', 'en-gb.ts');
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/export const enGb:\s*Record<[^>]+>\s*=\s*\{([\s\S]*?)\n\};/);
  if (!match) throw new Error('não foi possível ler os overrides de en-gb.ts');
  const body = match[1].replace(/^\s*\.\.\.en,?\s*$/m, '');
  return new Function(`return {${body}}`)();
}

function exportCatalogs({ root = ROOT, outDir = DEFAULT_OUT } = {}) {
  const { catalogs, LOCALE_CODES } = loadCompiled(root);
  fs.mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const code of LOCALE_CODES) {
    const meta = LOCALES.find((locale) => locale.code === code);
    if (!meta) throw new Error(`locale sem metadados: ${code}`);
    const payload =
      code === 'en-gb'
        ? { locale: code, base: 'en', messages: readEnGbOverrides(root) }
        : { locale: code, messages: catalogs[code] };
    fs.writeFileSync(path.join(outDir, `${code}.json`), `${JSON.stringify(payload, null, 2)}\n`);
    written.push(code);
  }
  return written;
}

function main() {
  const rootArg = process.argv.indexOf('--root');
  const outArg = process.argv.indexOf('--out');
  const root = rootArg >= 0 ? path.resolve(process.argv[rootArg + 1]) : ROOT;
  const outDir =
    outArg >= 0 ? path.resolve(process.argv[outArg + 1]) : path.join(root, 'i18n-export');
  const written = exportCatalogs({ root, outDir });
  console.log(`Exportados ${written.length} locales em ${outDir}`);
}

module.exports = { exportCatalogs, loadCompiled, readEnGbOverrides, ROOT, DEFAULT_OUT, main };

if (require.main === module) main();
