import './setup.js';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { test } from 'node:test';

interface PackageTargetModule {
  GLUE_TARGETS: string[];
  THIN_ONLY_TARGETS: string[];
  PACKAGE_TARGETS: string[];
  glueFileName: (target: string, version: string) => string;
  isGlueTarget: (target: string) => boolean;
  isPackageTarget: (target: string) => boolean;
  staleGlueFiles: (target: string, files: string[], version: string) => string[];
}

interface PublishModule {
  buildVsceArgs: (args: string[]) => string[];
}

const req = createRequire(__filename);
const {
  GLUE_TARGETS,
  THIN_ONLY_TARGETS,
  PACKAGE_TARGETS,
  glueFileName,
  isGlueTarget,
  isPackageTarget,
  staleGlueFiles,
} = req('../../../scripts/package-target.cjs') as PackageTargetModule;
const { buildVsceArgs } = req('../../../scripts/publish.cjs') as PublishModule;

const FILES = [
  'oracledb-7.0.1-darwin-arm64.node',
  'oracledb-7.0.1-linux-arm64.node',
  'oracledb-7.0.1-linux-x64.node',
  'oracledb-7.0.1-win32-x64.node',
  'oracledb-7.0.1-js-buildinfo.txt',
];

test('alvos: 4 com glue + 5 thin-only, sem web', () => {
  assert.deepStrictEqual(GLUE_TARGETS, ['win32-x64', 'linux-x64', 'linux-arm64', 'darwin-arm64']);
  assert.deepStrictEqual(THIN_ONLY_TARGETS, [
    'win32-arm64',
    'darwin-x64',
    'linux-armhf',
    'alpine-x64',
    'alpine-arm64',
  ]);
  assert.deepStrictEqual(PACKAGE_TARGETS, [...GLUE_TARGETS, ...THIN_ONLY_TARGETS]);
});

test('isPackageTarget/isGlueTarget: classifica os alvos', () => {
  assert.ok(isPackageTarget('linux-x64'));
  assert.ok(isPackageTarget('win32-arm64'));
  assert.ok(!isPackageTarget('web'));
  assert.ok(!isPackageTarget(''));

  assert.ok(isGlueTarget('darwin-arm64'));
  assert.ok(!isGlueTarget('darwin-x64'));
  assert.ok(!isGlueTarget('alpine-x64'));
});

test('glueFileName: monta o nome com a versão do driver', () => {
  assert.strictEqual(glueFileName('win32-x64', '7.0.1'), 'oracledb-7.0.1-win32-x64.node');
});

test('staleGlueFiles: alvo com glue mantém só a sua e ignora .txt', () => {
  assert.deepStrictEqual(staleGlueFiles('linux-x64', FILES, '7.0.1'), [
    'oracledb-7.0.1-darwin-arm64.node',
    'oracledb-7.0.1-linux-arm64.node',
    'oracledb-7.0.1-win32-x64.node',
  ]);
});

test('staleGlueFiles: alvo thin-only remove todas as glues (fallback)', () => {
  assert.deepStrictEqual(staleGlueFiles('win32-arm64', FILES, '7.0.1'), [
    'oracledb-7.0.1-darwin-arm64.node',
    'oracledb-7.0.1-linux-arm64.node',
    'oracledb-7.0.1-linux-x64.node',
    'oracledb-7.0.1-win32-x64.node',
  ]);
  assert.deepStrictEqual(staleGlueFiles('alpine-x64', FILES, '7.0.1').length, 4);
});

test('staleGlueFiles: alvo único não remove nada', () => {
  assert.deepStrictEqual(
    staleGlueFiles('win32-x64', ['oracledb-7.0.1-win32-x64.node'], '7.0.1'),
    [],
  );
});

test('staleGlueFiles: alvo inválido lança', () => {
  assert.throws(() => staleGlueFiles('plan9', FILES, '7.0.1'), /target desconhecido/);
});

test('publish.buildVsceArgs: --packagePath publica o artefato já gerado', () => {
  assert.deepStrictEqual(buildVsceArgs(['--packagePath', 'ext@linux-x64.vsix']), [
    'publish',
    '--packagePath',
    'ext@linux-x64.vsix',
  ]);
});

test('publish.buildVsceArgs: --target re-empacota (legado)', () => {
  assert.deepStrictEqual(buildVsceArgs(['--target', 'linux-x64']), [
    'publish',
    '--target',
    'linux-x64',
  ]);
});

test('publish.buildVsceArgs: sem flags publica universal', () => {
  assert.deepStrictEqual(buildVsceArgs([]), ['publish']);
});

test('publish.buildVsceArgs: packagePath tem precedência sobre target', () => {
  assert.deepStrictEqual(buildVsceArgs(['--target', 'linux-x64', '--packagePath', 'a.vsix']), [
    'publish',
    '--packagePath',
    'a.vsix',
  ]);
});
