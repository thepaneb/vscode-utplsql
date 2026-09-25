import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import {
  __getErrorMessages,
  __getInformationMessages,
  __getWarningMessages,
  __resetConfigValues,
  __resetMessages,
  __resetMockDirectoryEntries,
  __resetMockFiles,
  __setActiveTextEditor,
  __setConfigValue,
  __setMockDirectoryEntries,
  __setMockDirectoryError,
  __setMockFile,
  commands,
  debug,
  FileType,
  Uri,
  workspace,
} from '../vscode-stub';

// Cobre `commands/debug.ts` com o debugger e o compileForDebug mockados —
// sem sessão de debug nem banco.

let capturedTargets: Array<Record<string, unknown>> = [];
let compileResult: { ok: string[]; failed: Array<{ name: string; error: string }> } = {
  ok: ['OBJ'],
  failed: [],
};
let compileThrow = false;
let compileError: unknown = new Error('compile boom');

mock.module('../../compileForDebug.js', {
  namedExports: {
    debuggableFromFile: (p: string) =>
      /\.(pks|pkb|sql)$/i.test(p) ? { name: 'OBJ', kinds: ['package'] } : undefined,
    compileForDebug: async (targets: Array<Record<string, unknown>>) => {
      capturedTargets = targets;
      if (compileThrow) throw compileError;
      return compileResult;
    },
  },
});

const startArgs: string[] = [];
let startThrow = false;
let startError: unknown = new Error('debug boom');

mock.module('../../debugger.js', {
  namedExports: {
    startDebugSession: async (pkg: string) => {
      startArgs.push(pkg);
      if (startThrow) throw startError;
    },
    UtplsqlDebugAdapterDescriptorFactory: class {
      createDebugAdapterDescriptor() {}
    },
    UtplsqlDebugConfigurationProvider: class {
      resolveDebugConfiguration() {}
    },
  },
});

function editor(fileName: string) {
  return {
    document: {
      fileName,
      uri: { fsPath: fileName, path: fileName, scheme: 'file', toString: () => fileName },
      getText: () => '',
    },
    selection: { active: { line: 0 } },
  } as never;
}

async function register() {
  commands.__resetRegisteredCommands();
  __resetMessages();
  __resetConfigValues();
  __resetMockFiles();
  __resetMockDirectoryEntries();
  __setActiveTextEditor(undefined);
  capturedTargets = [];
  compileResult = { ok: ['OBJ'], failed: [] };
  compileThrow = false;
  compileError = new Error('compile boom');
  startArgs.length = 0;
  startThrow = false;
  startError = new Error('debug boom');
  const { registerDebug } = await import('../../commands/debug.js');
  registerDebug({ subscriptions: [] } as never);
}

test('debugTest: desabilitado informa', async () => {
  await register();
  __setConfigValue('debugger.enabled', false);
  await commands.__getRegisteredCommand('utplsql.debugTest')?.();
  assert.deepStrictEqual(__getInformationMessages(), [
    'Debug PL/SQL desabilitado (utplsql.debugger.enabled).',
  ]);
  assert.deepStrictEqual(startArgs, []);
});

test('debugTest: sem editor avisa para abrir .pks/.pkb', async () => {
  await register();
  await commands.__getRegisteredCommand('utplsql.debugTest')?.();
  assert.deepStrictEqual(__getWarningMessages(), ['Abra um arquivo .pks/.pkb para debugar.']);
});

test('debugTest: inicia a sessão com o nome do package', async () => {
  await register();
  __setActiveTextEditor(editor('/tmp/ut_math.pks'));
  await commands.__getRegisteredCommand('utplsql.debugTest')?.();
  assert.deepStrictEqual(startArgs, ['ut_math']);
});

test('debugTest: erro ao iniciar vira mensagem de erro', async () => {
  await register();
  __setActiveTextEditor(editor('/tmp/ut_math.pks'));
  startThrow = true;
  await commands.__getRegisteredCommand('utplsql.debugTest')?.();
  assert.deepStrictEqual(__getErrorMessages(), ['debug boom']);
});

test('compileForDebug: desabilitado informa', async () => {
  await register();
  __setConfigValue('debugger.enabled', false);
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.();
  assert.deepStrictEqual(__getInformationMessages(), [
    'Debug PL/SQL desabilitado (utplsql.debugger.enabled).',
  ]);
});

test('compileForDebug: sem alvo informa que nada foi encontrado', async () => {
  await register();
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.();
  assert.deepStrictEqual(__getInformationMessages(), [
    'Nenhum objeto PL/SQL para compilar para debug nesta seleção.',
  ]);
});

test('compileForDebug: compila um arquivo debuggável', async () => {
  await register();
  __setMockFile('**/*', '/tmp/proj/ut_x.pks', '');
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.(
    Uri.file('/tmp/proj/ut_x.pks'),
  );
  assert.strictEqual(capturedTargets.length, 1);
  assert.strictEqual(capturedTargets[0].name, 'OBJ');
  assert.deepStrictEqual(__getInformationMessages(), ['Compilado para debug: OBJ']);
});

test('compileForDebug: arquivo não debuggável é ignorado', async () => {
  await register();
  __setMockFile('**/*', '/tmp/proj/nota.txt', '');
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.(
    Uri.file('/tmp/proj/nota.txt'),
  );
  assert.strictEqual(capturedTargets.length, 0);
  assert.deepStrictEqual(__getInformationMessages(), [
    'Nenhum objeto PL/SQL para compilar para debug nesta seleção.',
  ]);
});

test('compileForDebug: pasta filtra por extensão de objeto', async () => {
  await register();
  __setMockDirectoryEntries('/tmp/proj/pkg', [
    ['ut_a.pks', FileType.File],
    ['nota.txt', FileType.File],
  ]);
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.(Uri.file('/tmp/proj/pkg'));
  assert.strictEqual(capturedTargets.length, 1);
});

test('compileForDebug: falha de compilação vira mensagem de erro', async () => {
  await register();
  __setMockFile('**/*', '/tmp/proj/ut_x.pks', '');
  compileResult = { ok: [], failed: [{ name: 'OBJ', error: 'ORA-00900' }] };
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.(
    Uri.file('/tmp/proj/ut_x.pks'),
  );
  assert.deepStrictEqual(__getErrorMessages(), ['Falha ao compilar para debug: OBJ: ORA-00900']);
});

test('compileForDebug: exceção inesperada vira mensagem de erro', async () => {
  await register();
  __setMockFile('**/*', '/tmp/proj/ut_x.pks', '');
  compileThrow = true;
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.(
    Uri.file('/tmp/proj/ut_x.pks'),
  );
  assert.deepStrictEqual(__getErrorMessages(), ['Falha ao compilar para debug: compile boom']);
});

test('compileForDebug: modo schema deriva o owner do caminho', async () => {
  await register();
  __setConfigValue('organization', 'schema');
  workspace.__setWorkspaceFolders([{ uri: { fsPath: '/tmp/proj' }, name: 'proj', index: 0 }]);
  __setMockFile('**/*', '/tmp/proj/db/APP/ut_x.pks', '');
  try {
    await commands.__getRegisteredCommand('utplsql.compileForDebug')?.(
      Uri.file('/tmp/proj/db/APP/ut_x.pks'),
    );
    assert.strictEqual(capturedTargets[0].owner, 'APP');
  } finally {
    workspace.__setWorkspaceFolders(undefined);
  }
});

test('compileForDebug: erro ao ler a pasta é tratado como vazio', async () => {
  await register();
  __setMockDirectoryEntries('/tmp/proj/pkg', []);
  __setMockDirectoryError('/tmp/proj/pkg', true);
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.(Uri.file('/tmp/proj/pkg'));
  assert.strictEqual(capturedTargets.length, 0);
  assert.deepStrictEqual(__getInformationMessages(), [
    'Nenhum objeto PL/SQL para compilar para debug nesta seleção.',
  ]);
});

test('registerDebug: expõe factories DAP funcionais', async () => {
  await register();
  const factory = debug.__getDebugAdapterFactory('utplsql') as {
    createDebugAdapterDescriptor: (s: unknown) => Promise<unknown>;
  };
  const provider = debug.__getDebugConfigProvider('utplsql') as {
    resolveDebugConfiguration: (f: unknown, c: unknown) => Promise<unknown>;
  };
  assert.ok(factory);
  assert.ok(provider);
  await assert.doesNotReject(() => factory.createDebugAdapterDescriptor({}));
  await assert.doesNotReject(() => provider.resolveDebugConfiguration(undefined, {}));
});

test('registerDebug: falha no registro DAP não derruba a ativação', async () => {
  debug.__setDebugRegistrationThrow(true);
  try {
    await register();
    assert.ok(commands.__getRegisteredCommand('utplsql.debugTest'));
  } finally {
    debug.__setDebugRegistrationThrow(false);
  }
});

test('compileForDebug: modo schema sem workspace folder não define owner', async () => {
  await register();
  __setConfigValue('organization', 'schema');
  workspace.__setWorkspaceFolders(undefined);
  __setMockFile('**/*', '/tmp/proj/db/APP/ut_x.pks', '');
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.(
    Uri.file('/tmp/proj/db/APP/ut_x.pks'),
  );
  assert.strictEqual(capturedTargets[0].owner, undefined);
});

test('compileForDebug: falha no stat da URI retorna nenhum alvo', async () => {
  await register();
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.(
    Uri.file('/tmp/proj/missing.pks'),
  );
  assert.strictEqual(capturedTargets.length, 0);
  assert.deepStrictEqual(__getInformationMessages(), [
    'Nenhum objeto PL/SQL para compilar para debug nesta seleção.',
  ]);
});

test('compileForDebug: usa o documento do editor ativo quando não há URI', async () => {
  await register();
  __setActiveTextEditor(editor('/tmp/ut_editor.pks'));
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.();
  assert.strictEqual(capturedTargets.length, 1);
  assert.strictEqual(capturedTargets[0].name, 'OBJ');
  assert.deepStrictEqual(__getInformationMessages(), ['Compilado para debug: OBJ']);
});

test('compileForDebug: diretório ignora symlink e arquivos sem extensão', async () => {
  await register();
  __setMockDirectoryEntries('/tmp/proj/mixed', [
    ['ut_ok.pks', FileType.File],
    ['ut_link.pks', FileType.SymbolicLink],
    ['README', FileType.File],
    ['.pks', FileType.File],
  ]);
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.(Uri.file('/tmp/proj/mixed'));
  assert.strictEqual(capturedTargets.length, 1);
  assert.strictEqual(capturedTargets[0].name, 'OBJ');
});

test('debugTest: erro string vira mensagem de erro', async () => {
  await register();
  __setActiveTextEditor(editor('/tmp/ut_math.pks'));
  startThrow = true;
  startError = 'erro-debug-string';
  await commands.__getRegisteredCommand('utplsql.debugTest')?.();
  assert.deepStrictEqual(__getErrorMessages(), ['erro-debug-string']);
});

test('compileForDebug: erro string vira mensagem de erro', async () => {
  await register();
  __setMockFile('**/*', '/tmp/proj/ut_x.pks', '');
  compileThrow = true;
  compileError = 'erro-compile-string';
  await commands.__getRegisteredCommand('utplsql.compileForDebug')?.(
    Uri.file('/tmp/proj/ut_x.pks'),
  );
  assert.deepStrictEqual(__getErrorMessages(), [
    'Falha ao compilar para debug: erro-compile-string',
  ]);
});
