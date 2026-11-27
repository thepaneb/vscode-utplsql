#!/usr/bin/env node
/**
 * Reimporta os JSONs do pipeline de localização (PRD-93).
 *
 * Regenera `src/i18n/locales/<locale>.ts` a partir de `{ locale, base?,
 * messages }`; o arquivo inteiro é reescrito (em vez de edição cirúrgica) e o
 * `npm run i18n:apply` roda o Biome depois. `base: "en"` produz o overlay
 * `...en` do en-gb.
 *
 * Uso:
 *   node scripts/i18n-apply.cjs [--in <dir>] [--root <dir>]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LOCALES } = require('./i18n-locale-meta.cjs');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_IN = path.join(ROOT, 'i18n-export');

function quote(value) {
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}'`;
}

function serializeValue(value, indent) {
  if (typeof value === 'string') return quote(value);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value).map(
      ([key, form]) => `${indent}  ${quote(key)}: ${quote(form)},`,
    );
    return `{\n${entries.join('\n')}\n${indent}}`;
  }
  throw new Error(`valor de tradução inválido: ${JSON.stringify(value)}`);
}

function serializeMessages(messages, indent = '  ') {
  return Object.entries(messages)
    .map(([key, value]) => `${indent}${quote(key)}: ${serializeValue(value, indent)},`)
    .join('\n');
}

function applyLocale({ root = ROOT, locale, base, messages }) {
  const meta = LOCALES.find((entry) => entry.code === locale);
  if (!meta) throw new Error(`locale desconhecido: ${locale}`);
  let baseMeta;
  if (base) {
    baseMeta = LOCALES.find((entry) => entry.code === base);
    if (!baseMeta) throw new Error(`locale base desconhecido: ${base}`);
  }
  const dir = path.join(root, 'src', 'i18n', 'locales');
  fs.mkdirSync(dir, { recursive: true });
  const header =
    `// Catálogo i18n \`${locale}\`. PURO (sem 'vscode').\n` +
    '// Gerado por scripts/i18n-apply.cjs; paridade em i18n.test.ts.\n';
  const imports = baseMeta
    ? `import { ${baseMeta.symbol} } from './${baseMeta.code}';\nimport type { Message } from './types';\n\n`
    : "import type { Message } from './types';\n\n";
  const spread = baseMeta ? `  ...${baseMeta.symbol},\n` : '';
  const body =
    `export const ${meta.symbol}: Record<string, Message> = {\n` +
    `${spread}${serializeMessages(messages)}\n};\n`;
  const file = path.join(dir, meta.file);
  fs.writeFileSync(file, header + imports + body);
  return file;
}

function applyAll({ root = ROOT, inputDir = DEFAULT_IN } = {}) {
  const files = fs
    .readdirSync(inputDir)
    .filter((file) => file.endsWith('.json'))
    .sort();
  const applied = [];
  for (const file of files) {
    const payload = JSON.parse(fs.readFileSync(path.join(inputDir, file), 'utf8'));
    applyLocale({ root, ...payload });
    applied.push(payload.locale);
  }
  return applied;
}

function main() {
  const rootArg = process.argv.indexOf('--root');
  const inArg = process.argv.indexOf('--in');
  const root = rootArg >= 0 ? path.resolve(process.argv[rootArg + 1]) : ROOT;
  const inputDir =
    inArg >= 0 ? path.resolve(process.argv[inArg + 1]) : path.join(root, 'i18n-export');
  const applied = applyAll({ root, inputDir });
  console.log(`Aplicados ${applied.length} locales de ${inputDir}`);
}

module.exports = { applyLocale, applyAll, serializeMessages, serializeValue, quote, ROOT, main };

if (require.main === module) main();
