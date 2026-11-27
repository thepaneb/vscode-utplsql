#!/usr/bin/env node
/**
 * Varredura de literais de UI fora de `t()` (PRD-89).
 *
 * Parser léxico ancorado nas chamadas `showInformationMessage`,
 * `showWarningMessage` e `showErrorMessage`: reporta o primeiro argumento quando
 * é string/template **sem** interpolação. O TypeScript 7 (nativo) não expõe mais
 * o parser clássico no Node, então a varredura é por regex de chamada — o alvo é
 * estável e a allowlist versionada absorve exceções.
 *
 * A allowlist (`scripts/scrape-strings.allow.json`) é um array de
 * `{ file, text? }` (text ausente = arquivo inteiro). Por padrão só avisa
 * (exit 0); `--strict` falha quando há achados não allowlistados.
 *
 * Uso:
 *   node scripts/scrape-strings.cjs [--strict] [--root <dir>]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const UI_CALLS = ['showInformationMessage', 'showWarningMessage', 'showErrorMessage'];
const CALL_RE = new RegExp(
  `\\b(?:${UI_CALLS.join('|')})\\s*\\(\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)"|\`([^\`$]*)\`)`,
  'g',
);

/** Arquivos `.ts` de `src/`, ignorando `src/test`. */
function sourceFiles(root = ROOT) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'test') continue;
        walk(full);
      } else if (entry.name.endsWith('.ts')) {
        out.push(full);
      }
    }
  };
  walk(path.join(root, 'src'));
  return out;
}

/** Achados: { file, line, text } em ordem estável. */
function scan(root = ROOT) {
  const findings = [];
  for (const file of sourceFiles(root)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(CALL_RE)) {
      const literal = match[1] ?? match[2] ?? match[3] ?? '';
      const index = match.index ?? 0;
      // Só é o argumento inteiro (não concatenação/interpolação): o próximo
      // token precisa ser `,` (outros argumentos) ou `)` (fim da chamada).
      if (!/^\s*[,)]/.test(text.slice(index + match[0].length))) continue;
      const line = text.slice(0, index).split('\n').length;
      findings.push({
        file: path.relative(root, file).split(path.sep).join('/'),
        line,
        text: literal.replace(/\\(['"`\\])/g, '$1'),
      });
    }
  }
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

/** Allowlist versionada: array de { file, text? }. */
function loadAllowlist(root = ROOT) {
  const file = path.join(root, 'scripts', 'scrape-strings.allow.json');
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isAllowed(finding, allowlist) {
  return allowlist.some(
    (entry) =>
      entry &&
      entry.file === finding.file &&
      (entry.text === undefined || entry.text === finding.text),
  );
}

function main() {
  const rootArg = process.argv.indexOf('--root');
  const root = rootArg >= 0 ? path.resolve(process.argv[rootArg + 1]) : ROOT;
  const strict = process.argv.includes('--strict');
  const allowlist = loadAllowlist(root);
  const pending = scan(root).filter((finding) => !isAllowed(finding, allowlist));
  if (!pending.length) {
    console.log('OK: nenhuma string de UI hardcoded fora de t().');
    return;
  }
  console.log('Strings de UI hardcoded (use t()):');
  for (const finding of pending) {
    console.log(`  ⚠ ${finding.file}:${finding.line} ${JSON.stringify(finding.text)}`);
  }
  console.log(`\n${pending.length} achado(s).`);
  if (strict) process.exitCode = 1;
}

module.exports = { scan, loadAllowlist, isAllowed, sourceFiles, UI_CALLS, main };

if (require.main === module) main();
