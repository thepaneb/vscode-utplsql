#!/usr/bin/env node
/**
 * Inventário das APIs do VS Code usadas no código de produção (`src/**`, fora de
 * `src/test/**`), com onde cada símbolo é diretamente referenciado.
 *
 * Uso:
 *   node scripts/vscode-api-inventory.cjs           # relatório (símbolo -> arquivo:linha)
 *   node scripts/vscode-api-inventory.cjs --json    # JSON
 *
 * Também exporta `scanVscodeApi(root?)` para o `brain.cjs` gerar a nota do vault.
 *
 * Escopo: apenas uso via alias `vscode.*` (o projeto importa sempre como
 * `import * as vscode from 'vscode'`). Cobre namespaces (`vscode.window`),
 * membros (`vscode.window.showInputBox`), tipos e enums (`vscode.Uri`).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const API_RE = /\bvscode\.([A-Za-z_$][\w$]*)(?:\.([A-Za-z_$][\w$]*))?/g;

function walkProduction(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'test' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkProduction(full, out);
    else if (e.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/**
 * @param {string} [root] raiz do repo (default: a deste script)
 * @returns {Map<string, {file: string, line: number}[]>} API -> referências
 */
function scanVscodeApi(root = ROOT) {
  const refs = new Map();
  for (const abs of walkProduction(path.join(root, 'src'))) {
    const rel = path.relative(root, abs).split(path.sep).join('/');
    const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const m of line.matchAll(API_RE)) {
        const api = m[2] ? `vscode.${m[1]}.${m[2]}` : `vscode.${m[1]}`;
        if (!refs.has(api)) refs.set(api, []);
        refs.get(api).push({ file: rel, line: i + 1 });
      }
    });
  }
  return refs;
}

/** Resumo ordenado por uso: { api, count, files[] }. */
function summarize(refs = scanVscodeApi()) {
  return [...refs.entries()]
    .map(([api, list]) => ({
      api,
      count: list.length,
      files: [...new Set(list.map((r) => r.file))].sort(),
    }))
    .sort((a, b) => b.count - a.count || a.api.localeCompare(b.api));
}

function main() {
  const json = process.argv.includes('--json');
  const refs = scanVscodeApi();
  if (json) {
    console.log(JSON.stringify(summarize(refs), null, 2));
    return;
  }
  const rows = summarize(refs);
  const total = rows.reduce((n, r) => n + r.count, 0);
  console.log(`APIs do VS Code em src/** (produção): ${rows.length} símbolos, ${total} referências\n`);
  for (const r of rows) {
    console.log(`${r.api}  (${r.count})`);
    for (const ref of refs.get(r.api)) console.log(`  ${ref.file}:${ref.line}`);
  }
}

module.exports = { scanVscodeApi, summarize };

if (require.main === module) main();
