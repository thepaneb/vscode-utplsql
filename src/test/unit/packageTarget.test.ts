import './setup.js';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { test } from 'node:test';

interface PackageTargetFs {
  readFileSync: (filePath: string, encoding: string) => string;
  readdirSync: (dirPath: string) => string[];
  rmSync: (filePath: string) => void;
}

interface PackageTargetModule {
  GLUE_TARGETS: string[];
  THIN_ONLY_TARGETS: string[];
  PACKAGE_TARGETS: string[];
  glueFileName: (target: string, version: string) => string;
  isGlueTarget: (target: string) => boolean;
  isPackageTarget: (target: string) => boolean;
  staleGlueFiles: (target: string, files: string[], version: string) => string[];
  readVersion: (pkgPath: string, fsImpl?: PackageTargetFs) => string;
  main: (options?: {
    argv?: string[];
    fsImpl?: PackageTargetFs;
    spawnSyncImpl?: (
      command: string,
      args: string[],
      options: { stdio: 'inherit'; cwd: string; shell: boolean },
    ) => { status: number | null; error?: Error };
    platform?: NodeJS.Platform;
    log?: (message: string) => void;
    error?: (message: string) => void;
  }) => number;
}

interface PublishModule {
  buildVsceArgs: (args: string[]) => string[];
  main: (options?: {
    argv?: string[];
    env?: NodeJS.ProcessEnv;
    fsImpl?: { existsSync: (filePath: string) => boolean };
    spawnSyncImpl?: (
      command: string,
      args: string[],
      options: { stdio: 'inherit'; shell: boolean },
    ) => { status: number | null; error?: Error };
    platform?: NodeJS.Platform;
    log?: (message: string) => void;
    warn?: (message: string) => void;
    error?: (message: string) => void;
  }) => number;
}

const ROOT = path.resolve(__dirname, '../../..');
const req = createRequire(__filename);
const {
  GLUE_TARGETS,
  THIN_ONLY_TARGETS,
  PACKAGE_TARGETS,
  glueFileName,
  isGlueTarget,
  isPackageTarget,
  staleGlueFiles,
  readVersion,
  main: packageMain,
} = req('../../../scripts/package-target.cjs') as PackageTargetModule;
const { buildVsceArgs, main: publishMain } = req('../../../scripts/publish.cjs') as PublishModule;

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

test('package-target.readVersion: extrai a versão do package.json', () => {
  const fsImpl: PackageTargetFs = {
    readFileSync: (filePath, encoding) => {
      assert.strictEqual(filePath, '/tmp/package.json');
      assert.strictEqual(encoding, 'utf8');
      return '{"version":"1.2.3"}';
    },
    readdirSync: () => [],
    rmSync: () => {},
  };

  assert.strictEqual(readVersion('/tmp/package.json', fsImpl), '1.2.3');
});

test('package-target.main: lê versões, limpa glues e monta argumentos do vsce', () => {
  const reads: string[] = [];
  const removed: string[] = [];
  const logs: string[] = [];
  const calls: Array<{
    command: string;
    args: string[];
    options: { stdio: 'inherit'; cwd: string; shell: boolean };
  }> = [];
  const fsImpl: PackageTargetFs = {
    readFileSync(filePath) {
      reads.push(filePath);
      if (filePath.includes(`${path.sep}oracledb${path.sep}package.json`)) {
        return '{"version":"7.0.1"}';
      }
      return '{"version":"0.13.0"}';
    },
    readdirSync: () => FILES,
    rmSync: (filePath) => removed.push(filePath),
  };
  const code = packageMain({
    argv: ['linux-x64'],
    fsImpl,
    spawnSyncImpl: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0 };
    },
    platform: 'linux',
    log: (message) => logs.push(message),
    error: () => {},
  });

  assert.strictEqual(code, 0);
  assert.strictEqual(reads.length, 2);
  assert.ok(reads[0].endsWith(path.join('node_modules', 'oracledb', 'package.json')));
  assert.ok(reads[1].endsWith(path.join('package.json')));
  assert.deepStrictEqual(removed, [
    path.join(ROOT, 'node_modules', 'oracledb', 'build', 'Release', FILES[0]),
    path.join(ROOT, 'node_modules', 'oracledb', 'build', 'Release', FILES[1]),
    path.join(ROOT, 'node_modules', 'oracledb', 'build', 'Release', FILES[3]),
  ]);
  assert.deepStrictEqual(calls, [
    {
      command: 'vsce',
      args: ['package', '--target', 'linux-x64', '--out', 'vscode-utplsql-0.13.0@linux-x64.vsix'],
      options: {
        stdio: 'inherit',
        cwd: ROOT,
        shell: false,
      },
    },
  ]);
  assert.ok(logs.some((message) => message.includes('glue removida')));
});

test('package-target.main: alvo thin-only remove todas as glues', () => {
  const removed: string[] = [];
  const logs: string[] = [];
  const code = packageMain({
    argv: ['win32-arm64'],
    fsImpl: {
      readFileSync: (filePath) =>
        filePath.includes(`${path.sep}oracledb${path.sep}package.json`)
          ? '{"version":"7.0.1"}'
          : '{"version":"0.13.0"}',
      readdirSync: () => FILES,
      rmSync: (filePath) => removed.push(filePath),
    },
    spawnSyncImpl: () => ({ status: 0 }),
    platform: 'linux',
    log: (message) => logs.push(message),
  });

  assert.strictEqual(code, 0);
  assert.strictEqual(removed.length, FILES.filter((file) => file.endsWith('.node')).length);
  assert.ok(logs.some((message) => message.includes('thin-only')));
});

test('package-target.main: alvo ausente retorna erro sem empacotar', () => {
  const errors: string[] = [];
  let spawned = false;
  const code = packageMain({
    argv: [],
    error: (message) => errors.push(message),
    spawnSyncImpl: () => {
      spawned = true;
      return { status: 0 };
    },
  });

  assert.strictEqual(code, 1);
  assert.strictEqual(spawned, false);
  assert.match(errors[0], /target obrigatório/);
});

test('package-target.main: falha de spawn retorna status de erro', () => {
  const code = packageMain({
    argv: ['linux-x64'],
    fsImpl: {
      readFileSync: (filePath) =>
        filePath.includes(`${path.sep}oracledb${path.sep}package.json`)
          ? '{"version":"7.0.1"}'
          : '{"version":"0.13.0"}',
      readdirSync: () => [],
      rmSync: () => {},
    },
    spawnSyncImpl: () => ({ status: null, error: new Error('vsce não encontrado') }),
    log: () => {},
  });

  assert.strictEqual(code, 1);
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

test('publish.main: packagePath verifica o artefato e publica o caminho', () => {
  const calls: Array<{
    command: string;
    args: string[];
    options: { stdio: 'inherit'; shell: boolean };
  }> = [];
  const logs: string[] = [];
  const existing: string[] = [];
  const code = publishMain({
    argv: ['--packagePath', 'artifact.vsix'],
    env: { CI: 'true' },
    fsImpl: {
      existsSync: (filePath) => {
        existing.push(filePath);
        return true;
      },
    },
    spawnSyncImpl: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0 };
    },
    platform: 'win32',
    log: (message) => logs.push(message),
    warn: () => {},
    error: () => {},
  });

  assert.strictEqual(code, 0);
  assert.deepStrictEqual(existing, ['artifact.vsix']);
  assert.deepStrictEqual(calls, [
    {
      command: 'vsce',
      args: ['publish', '--packagePath', 'artifact.vsix'],
      options: { stdio: 'inherit', shell: true },
    },
  ]);
  assert.deepStrictEqual(logs, ['📦 Publicando artefato: artifact.vsix']);
});

test('publish.main: target legado repassa o alvo ao vsce', () => {
  const calls: Array<{ args: string[]; options: { stdio: 'inherit'; shell: boolean } }> = [];
  const logs: string[] = [];
  const code = publishMain({
    argv: ['--target', 'linux-x64'],
    env: { CI: 'true' },
    spawnSyncImpl: (_command, args, options) => {
      calls.push({ args, options });
      return { status: 0 };
    },
    platform: 'linux',
    log: (message) => logs.push(message),
    warn: () => {},
    error: () => {},
  });

  assert.strictEqual(code, 0);
  assert.deepStrictEqual(calls, [
    { args: ['publish', '--target', 'linux-x64'], options: { stdio: 'inherit', shell: false } },
  ]);
  assert.deepStrictEqual(logs, ['📦 Publicando (re-empacotando) target: linux-x64']);
});

test('publish.main: sem flags usa publicação universal', () => {
  const calls: string[][] = [];
  const code = publishMain({
    env: { CI: 'true' },
    spawnSyncImpl: (_command, args) => {
      calls.push(args);
      return { status: 0 };
    },
    platform: 'linux',
    log: () => {},
    warn: () => {},
    error: () => {},
  });

  assert.strictEqual(code, 0);
  assert.deepStrictEqual(calls, [['publish']]);
});

test('publish.main: fora do CI não executa vsce', () => {
  let spawned = false;
  const warnings: string[] = [];
  const code = publishMain({
    env: {},
    spawnSyncImpl: () => {
      spawned = true;
      return { status: 0 };
    },
    log: () => {},
    warn: (message) => warnings.push(message),
    error: () => {},
  });

  assert.strictEqual(code, 1);
  assert.strictEqual(spawned, false);
  assert.match(warnings[0], /Publicacao apenas via GitHub workflow/);
});

test('publish.main: falha de spawn não é reportada como sucesso', () => {
  const code = publishMain({
    argv: [],
    env: { CI: 'true' },
    fsImpl: { existsSync: () => true },
    spawnSyncImpl: () => ({ status: null, error: new Error('vsce não encontrado') }),
    platform: 'linux',
    log: () => {},
    warn: () => {},
    error: () => {},
  });

  assert.strictEqual(code, 1);
});
