'use strict';

// Resolve o `vsce` para `spawnSync` SEM shell.
//
// O binário do vsce é um script Node (`#!/usr/bin/env node`), então roda-se com
// `process.execPath` em qualquer plataforma. Isso evita o `shell: true` — que no
// Windows exigiria `vsce.cmd` e permitiria injeção de comando via argumentos
// (ex.: `--out`/`--packagePath` com metacaracteres).

const path = require('path');

/**
 * @returns {{ command: string, argsPrefix: string[] }}
 */
function resolveVsce() {
  const pkgPath = require.resolve('@vscode/vsce/package.json');
  const pkg = require(pkgPath);
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.vsce;
  return { command: process.execPath, argsPrefix: [path.join(path.dirname(pkgPath), bin)] };
}

module.exports = { resolveVsce };
