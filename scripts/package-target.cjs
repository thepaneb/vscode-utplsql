#!/usr/bin/env node
/**
 * Empacota um VSIX por plataforma (Opção B do PRD-70).
 *
 *   node scripts/package-target.cjs <target>
 *
 * Dois grupos de alvos:
 *   - GLUE: o node-oracledb traz a glue nativa thick; o VSIX embarca só a glue
 *     do alvo (thick + thin).
 *   - THIN-ONLY: não há glue pré-compilada (e/ou Instant Client); o VSIX embarca
 *     sem nenhuma `.node`, funcionando em thin mode. É o fallback para as demais
 *     plataformas do VS Code.
 *
 * O `npm run package` universal (todas as glues, ~2,5 MB) continua para teste local.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// node-oracledb 7.0.1 publica glue pré-compilada para estes alvos (thick).
const GLUE_TARGETS = ['win32-x64', 'linux-x64', 'linux-arm64', 'darwin-arm64'];
// Alvos do VS Code sem glue: o VSIX vai sem binário nativo (thin mode apenas).
const THIN_ONLY_TARGETS = ['win32-arm64', 'darwin-x64', 'linux-armhf', 'alpine-x64', 'alpine-arm64'];
// `web` fica de fora: a extensão usa node APIs + node-oracledb.
const PACKAGE_TARGETS = [...GLUE_TARGETS, ...THIN_ONLY_TARGETS];

function isPackageTarget(value) {
  return PACKAGE_TARGETS.includes(value);
}

function isGlueTarget(value) {
  return GLUE_TARGETS.includes(value);
}

/** Nome da glue do node-oracledb para um alvo com binário nativo. */
function glueFileName(target, version) {
  return `oracledb-${version}-${target}.node`;
}

/**
 * Núcleo puro: dado o alvo e os nomes em `build/Release`, devolve as glues que
 * NÃO pertencem ao alvo (as que devem ser removidas). Para alvos thin-only,
 * remove todas as glues.
 */
function staleGlueFiles(target, files, version) {
  if (!isPackageTarget(target)) {
    throw new Error(`target desconhecido: ${target} (esperado: ${PACKAGE_TARGETS.join(', ')})`);
  }
  const nodes = files.filter((f) => f.endsWith('.node'));
  if (!isGlueTarget(target)) return nodes;
  const keep = glueFileName(target, version);
  return nodes.filter((f) => f !== keep);
}

function readVersion(pkgPath) {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
}

function main() {
  const target = process.argv[2];
  if (!isPackageTarget(target)) {
    console.error(`target obrigatório e suportado: ${PACKAGE_TARGETS.join(', ')}`);
    process.exit(1);
  }

  const root = path.resolve(__dirname, '..');
  const releaseDir = path.join(root, 'node_modules', 'oracledb', 'build', 'Release');
  const oracledbVersion = readVersion(path.join(root, 'node_modules', 'oracledb', 'package.json'));
  const pkgVersion = readVersion(path.join(root, 'package.json'));

  const mode = isGlueTarget(target) ? 'thick+thin' : 'thin-only';
  const stale = staleGlueFiles(target, fs.readdirSync(releaseDir), oracledbVersion);
  for (const file of stale) {
    fs.rmSync(path.join(releaseDir, file));
    console.log(`  🗑️  glue removida (não pertence a ${target}): ${file}`);
  }

  const out = `vscode-utplsql-${pkgVersion}@${target}.vsix`;
  console.log(`📦 Empacotando ${target} (${mode}) → ${out}`);
  const result = spawnSync('vsce', ['package', '--target', target, '--out', out], {
    stdio: 'inherit',
    cwd: root,
    shell: process.platform === 'win32',
  });
  process.exit(result.status ?? 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  GLUE_TARGETS,
  PACKAGE_TARGETS,
  THIN_ONLY_TARGETS,
  glueFileName,
  isGlueTarget,
  isPackageTarget,
  staleGlueFiles,
};
