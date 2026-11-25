#!/usr/bin/env node
/**
 * Gate de i18n do CI (PRD-93): catálogos × LOCALE_CODES × glossário.
 *
 * Roda depois do compile/test (usa `out/i18n/locales/index.js`):
 *   npm run i18n:check [--root <dir>]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LOCALES } = require('./i18n-locale-meta.cjs');

const ROOT = path.resolve(__dirname, '..');
const GLOSSARY_TERMS = ['utPLSQL', 'PL/SQL', 'V$SQL', 'thin', 'DBMS_DEBUG', 'wallet'];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function check(root = ROOT) {
  const problems = [];
  const compiledFile = path.join(root, 'out', 'i18n', 'locales', 'index.js');
  if (!fs.existsSync(compiledFile)) {
    return ['out/i18n/locales/index.js ausente; rode "npm run compile"'];
  }
  const { catalogs, LOCALE_CODES } = require(compiledFile);
  const expected = LOCALES.map((locale) => locale.code);
  if (JSON.stringify([...LOCALE_CODES]) !== JSON.stringify(expected)) {
    problems.push(
      `LOCALE_CODES ≠ scripts/i18n-locale-meta.cjs (${LOCALE_CODES.length} × ${expected.length})`,
    );
  }
  const baseKeys = Object.keys(catalogs['pt-br'] ?? {});
  for (const code of LOCALE_CODES) {
    const catalog = catalogs[code];
    if (!catalog) {
      problems.push(`${code}: catálogo ausente`);
      continue;
    }
    const missing = baseKeys.filter((key) => !(key in catalog));
    if (missing.length) problems.push(`${code}: ${missing.length} chave(s) ausente(s)`);
    if (code !== 'en' && !fs.existsSync(path.join(root, `package.nls.${code}.json`))) {
      problems.push(`${code}: package.nls.${code}.json ausente`);
    }
  }
  const glossary = read(path.join(root, 'docs', 'brain', '12-I18n', 'Glossário de localização.md'));
  if (!glossary) {
    problems.push('glossário ausente (docs/brain/12-I18n/Glossário de localização.md)');
  } else {
    for (const term of GLOSSARY_TERMS) {
      if (!glossary.includes(term)) problems.push(`glossário sem o termo "${term}"`);
    }
  }
  return problems;
}

function main() {
  const rootArg = process.argv.indexOf('--root');
  const root = rootArg >= 0 ? path.resolve(process.argv[rootArg + 1]) : ROOT;
  const problems = check(root);
  if (problems.length) {
    console.log('i18n — problemas:');
    for (const problem of problems) console.log(`  ✗ ${problem}`);
    console.log(`\n${problems.length} problema(s).`);
    process.exit(1);
  }
  console.log('OK: catálogos, manifests e glossário consistentes.');
}

module.exports = { check, GLOSSARY_TERMS, ROOT, main };

if (require.main === module) main();
