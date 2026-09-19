// Publica a extensão no VS Code Marketplace.
// Bloqueado localmente: a publicação é feita exclusivamente pelo workflow de
// release (publish.yml), que roda com CI=true (setado pelo GitHub Actions).
// Local: use `npm run package` para gerar o .vsix.
//
// Uso no CI (Opção B — PRD-70): publica o VSIX já empacotado por alvo, sem
// re-empacotar:
//   node scripts/publish.cjs --packagePath vscode-utplsql-<v>@<target>.vsix
// (legado/universal):
//   node scripts/publish.cjs [--target <target>]
'use strict';

const fs = require('fs');
const { spawnSync } = require('child_process');

function flagValue(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

/**
 * Núcleo puro: monta os argumentos do `vsce publish`.
 * `--packagePath` tem precedência sobre `--target` (o TargetPlatform já está no
 * manifesto do pacote, então não se passa `--target` junto).
 */
function buildVsceArgs(args) {
  const packagePath = flagValue(args, '--packagePath');
  if (packagePath) return ['publish', '--packagePath', packagePath];

  const target = flagValue(args, '--target');
  if (target) return ['publish', '--target', target];

  return ['publish'];
}

function main() {
  if (!process.env.CI) {
    console.warn(
      '⚠️ Publicacao apenas via GitHub workflow (release). Use npm run package para .vsix local.',
    );
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const vsceArgs = buildVsceArgs(args);
  const packagePath = flagValue(args, '--packagePath');

  if (packagePath && !fs.existsSync(packagePath)) {
    console.error(`❌ VSIX não encontrado: ${packagePath}`);
    process.exit(1);
  }
  if (packagePath) {
    console.log(`📦 Publicando artefato: ${packagePath}`);
  } else if (flagValue(args, '--target')) {
    console.log(`📦 Publicando (re-empacotando) target: ${flagValue(args, '--target')}`);
  }

  const result = spawnSync('vsce', vsceArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  process.exit(result.status ?? 0);
}

if (require.main === module) {
  main();
}

module.exports = { buildVsceArgs };
