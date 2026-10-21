#!/usr/bin/env node
// Resumo da matriz de bancos: lê o log de cada versão e grava JSONL + Markdown.
//
// Uso interno pelo run.sh:
//   node summary.cjs append --file <jsonl> --label 23free --image <img> \
//     --utplsql v.3.2.3 --status passed --log <log> --duration 123
//   node summary.cjs render --file <jsonl> --out <md>
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function sumAll(regex, text) {
  let total = 0;
  let found = false;
  for (const match of text.matchAll(regex)) {
    total += Number.parseInt(match[1], 10);
    found = true;
  }
  return found ? total : null;
}

/**
 * Extrai contagens de saída do `node --test` (ℹ tests/pass/fail/skipped) ou do
 * Mocha/vscode-test (`N passing`, `N failing`, `N pending`).
 */
function parseTestCounts(output) {
  const text = String(output ?? '');
  const node = {
    tests: sumAll(/ℹ\s*tests\s+(\d+)/gi, text),
    pass: sumAll(/ℹ\s*pass\s+(\d+)/gi, text),
    fail: sumAll(/ℹ\s*fail\s+(\d+)/gi, text),
    skipped: sumAll(/ℹ\s*skipped\s+(\d+)/gi, text),
  };
  if (node.tests !== null || node.pass !== null) {
    const pass = node.pass ?? 0;
    const fail = node.fail ?? 0;
    const skipped = node.skipped ?? 0;
    return {
      tests: node.tests ?? pass + fail + skipped,
      pass,
      fail,
      skipped,
      framework: 'node',
    };
  }

  // `--full` roda duas suítes Mocha no mesmo log (integração + multi-root):
  // soma os blocos em vez de usar só o primeiro/último.
  const mochaPass = sumAll(/(\d+)\s+passing/gi, text);
  const mochaFail = sumAll(/(\d+)\s+failing/gi, text);
  const mochaPending = sumAll(/(\d+)\s+pending/gi, text);
  if (mochaPass !== null || mochaFail !== null || mochaPending !== null) {
    const pass = mochaPass ?? 0;
    const fail = mochaFail ?? 0;
    const skipped = mochaPending ?? 0;
    return {
      tests: pass + fail + skipped,
      pass,
      fail,
      skipped,
      framework: 'mocha',
    };
  }

  return { tests: null, pass: null, fail: null, skipped: null, framework: null };
}

function entry({ label, image, utplsql, status, log, duration, output }) {
  return {
    label,
    image,
    utplsql,
    status,
    durationSeconds: Number.parseInt(String(duration ?? '0'), 10) || 0,
    log,
    ...parseTestCounts(output),
  };
}

function appendEntry(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(data)}\n`, 'utf8');
}

function readEntries(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function escapeCell(value) {
  // Escapa a barra invertida ANTES do pipe: `\|` sem isso pode ser reinterpretado
  // e permite quebrar a célula da tabela Markdown (CodeQL: incomplete escaping).
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function renderSummary(entries) {
  const lines = [
    '# Matriz de bancos — resumo',
    '',
    '| Banco | utPLSQL | Status | Testes | Pass | Fail | Skipped | Duração | Log |',
    '|---|---|---|---:|---:|---:|---:|---:|---|',
  ];
  for (const e of entries) {
    lines.push(
      `| ${escapeCell(e.label)} | ${escapeCell(e.utplsql)} | ${escapeCell(e.status)} | ${
        e.tests ?? '?'
      } | ${e.pass ?? '?'} | ${e.fail ?? '?'} | ${e.skipped ?? '?'} | ${
        e.durationSeconds ?? 0
      }s | ${escapeCell(e.log)} |`,
    );
  }
  if (entries.length === 0) {
    lines.push('| _(sem execuções)_ | | | | | | | | |');
  }
  lines.push(
    '',
    '> Contagens extraídas do log de cada versão; `?` = formato não reconhecido.',
    '',
  );
  return lines.join('\n');
}

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[name] = true;
    } else {
      flags[name] = next;
      i++;
    }
  }
  return flags;
}

function main(argv) {
  const [command, ...rest] = argv;
  const flags = parseArgs(rest);
  if (command === 'append') {
    const log = String(flags.log ?? '');
    const output = log && fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
    appendEntry(
      String(flags.file ?? ''),
      entry({
        label: flags.label,
        image: flags.image,
        utplsql: flags.utplsql,
        status: flags.status,
        log,
        duration: flags.duration,
        output,
      }),
    );
    return 0;
  }
  if (command === 'render') {
    const entries = readEntries(String(flags.file ?? ''));
    const out = String(flags.out ?? '');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${renderSummary(entries)}\n`, 'utf8');
    return 0;
  }
  console.error('uso: summary.cjs append|render [flags]');
  return 1;
}

module.exports = {
  parseTestCounts,
  entry,
  appendEntry,
  readEntries,
  renderSummary,
  escapeCell,
  parseArgs,
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
