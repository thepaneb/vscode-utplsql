import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import {
  __getErrorMessages,
  __getInformationMessages,
  __getLastQuickPickItems,
  __getWarningMessages,
  __resetConfigValues,
  __resetLastQuickPickItems,
  __resetMessages,
  __resetMockDirectoryEntries,
  __resetMockFiles,
  __setActiveTextEditor,
  __setConfigValue,
  __setMockDirectoryEntries,
  __setMockDirectoryError,
  __setMockFile,
  __setQuickPickResult,
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

function editor(fileName: string, text = '') {
  return {
    document: {
      fileName,
      uri: { fsPath: fileName, path: fileName, scheme: 'file', toString: () => fileName },
      getText: () => text,
    },
    selection: { active: { line: 0 } },
  } as never;
}

// Estado falso para as variações de debug (PRD-53).
const fakeState = {
  lastFailedItems: [] as Array<Record<string, unknown>>,
  meta: new Map<Record<string, unknown>, unknown>(),
  lastRun: undefined as unknown,
  getLastFailedItems() {
    return this.lastFailedItems;
  },
  getMeta(item: unknown) {
    return this.meta.get(item as Record<string, unknown>);
  },
  getLastRun() {
    return this.lastRun;
  },
};

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
  fakeState.lastFailedItems = [];
  fakeState.meta = new Map();
  fakeState.lastRun = undefined;
  __setQuickPickResult(undefined);
  __resetLastQuickPickItems();
  const { registerDebug } = await import('../../commands/debug.js');
  registerDebug({ subscriptions: [] } as never, { state: fakeState } as never);
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

// ── PRD-53: variações de debug ───────────────────────────────────────────────

const PKS = [
  'create or replace package ut_math is',
  '--%suite(Math)',
  '--%test(soma)',
  'procedure t_sum;',
  '--%test(subtracao)',
  'procedure t_sub;',
  'end;',
].join('\n');

test('debugAtCursor: desabilitado informa', async () => {
  await register();
  __setConfigValue('debugger.enabled', false);
  await commands.__getRegisteredCommand('utplsql.debugAtCursor')?.();
  assert.deepStrictEqual(__getInformationMessages(), [
    'Debug PL/SQL desabilitado (utplsql.debugger.enabled).',
  ]);
  assert.deepStrictEqual(startArgs, []);
});

test('debugAtCursor: sem .pks avisa', async () => {
  await register();
  __setActiveTextEditor(editor('/tmp/notes.txt', PKS));
  await commands.__getRegisteredCommand('utplsql.debugAtCursor')?.();
  assert.deepStrictEqual(__getWarningMessages(), [
    'Executar no cursor disponível apenas em arquivos .pks.',
  ]);
});

test('debugAtCursor: sem anotação avisa', async () => {
  await register();
  __setActiveTextEditor(editor('/tmp/ut_math.pks', 'nothing here\n'));
  await commands.__getRegisteredCommand('utplsql.debugAtCursor')?.();
  assert.deepStrictEqual(__getWarningMessages(), [
    'Nenhuma anotação %suite/%test encontrada na posição.',
  ]);
});

test('debugAtCursor: cursor no %test depura a procedure', async () => {
  await register();
  const ed = editor('/tmp/ut_math.pks', PKS) as { selection: { active: { line: number } } };
  ed.selection.active.line = 2; // linha do --%test(soma)
  __setActiveTextEditor(ed as never);
  await commands.__getRegisteredCommand('utplsql.debugAtCursor')?.();
  assert.deepStrictEqual(startArgs, ['ut_math']);
});

test('debugFailed: sem falhas avisa', async () => {
  await register();
  await commands.__getRegisteredCommand('utplsql.debugFailed')?.();
  assert.deepStrictEqual(__getWarningMessages(), ['Nenhum teste falhou na última execução.']);
  assert.deepStrictEqual(startArgs, []);
});

test('debugFailed: um único falho depura direto', async () => {
  await register();
  const item = { id: 'test:ut_math.t_sub' };
  fakeState.lastFailedItems = [item];
  fakeState.meta.set(item, { kind: 'test', packageName: 'ut_math', procName: 't_sub' });
  await commands.__getRegisteredCommand('utplsql.debugFailed')?.();
  assert.deepStrictEqual(startArgs, ['ut_math']);
});

test('debugFailed: vários falhos abre picker', async () => {
  await register();
  const a = { id: 'test:ut_math.t_a' };
  const b = { id: 'test:ut_math.t_b' };
  fakeState.lastFailedItems = [a, b];
  fakeState.meta.set(a, { kind: 'test', packageName: 'ut_math', procName: 't_a' });
  fakeState.meta.set(b, { kind: 'test', packageName: 'ut_math', procName: 't_b' });
  __setQuickPickResult({ label: 't_b', item: b });
  await commands.__getRegisteredCommand('utplsql.debugFailed')?.();
  assert.deepStrictEqual(startArgs, ['ut_math']);
  assert.ok(__getLastQuickPickItems());
});

test('debugFailed: picker cancelado não depura', async () => {
  await register();
  const a = { id: 'test:ut_math.t_a' };
  const b = { id: 'test:ut_math.t_b' };
  fakeState.lastFailedItems = [a, b];
  fakeState.meta.set(a, { kind: 'test', packageName: 'ut_math', procName: 't_a' });
  fakeState.meta.set(b, { kind: 'test', packageName: 'ut_math', procName: 't_b' });
  __setQuickPickResult(undefined);
  await commands.__getRegisteredCommand('utplsql.debugFailed')?.();
  assert.deepStrictEqual(startArgs, []);
});

test('debugLast: sem execução anterior informa', async () => {
  await register();
  await commands.__getRegisteredCommand('utplsql.debugLast')?.();
  assert.deepStrictEqual(__getInformationMessages(), ['Nenhuma execução anterior para repetir.']);
  assert.deepStrictEqual(startArgs, []);
});

test('debugLast: tipo test depura package + procedure', async () => {
  await register();
  fakeState.lastRun = { type: 'test', packageName: 'ut_math', procName: 't_sum', coverage: false };
  await commands.__getRegisteredCommand('utplsql.debugLast')?.();
  assert.deepStrictEqual(startArgs, ['ut_math']);
});

test('debugLast: tipo all cai no caminho dos falhos', async () => {
  await register();
  fakeState.lastRun = { type: 'all', coverage: false };
  await commands.__getRegisteredCommand('utplsql.debugLast')?.();
  // sem falhas registradas, o fallback avisa
  assert.deepStrictEqual(__getWarningMessages(), ['Nenhum teste falhou na última execução.']);
});
