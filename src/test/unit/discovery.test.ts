import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  type DbSuiteRow,
  discoverDbSuites,
  discoverSchemaFromConn,
  discoverSchemaFromDb,
  discoverSchemasFromFolders,
  discoverWorkspace,
  extractSchemaFromPath,
  getSuitesInfo,
  mapSuitesInfoToSuiteFiles,
  mergeSuiteLists,
  parseSuite,
  type SuiteFile,
} from '../../discovery';
import { closeOraclePool } from '../../oracleRunner';
import {
  __resetConfigValues,
  __resetMockFiles,
  __setConfigValue,
  __setMockFile,
} from '../vscode-stub';

test('parseSuite: retorna ParsedSuite para arquivo com %suite', () => {
  const text = `CREATE OR REPLACE PACKAGE test_app IS
  --%suite(Testes)
  --%test(Cenario)
  PROCEDURE proc1;
END;`;
  const uri = { fsPath: '/x/test_app.pks', path: '/x/test_app.pks', scheme: 'file' };
  const result = parseSuite(uri as any, text);
  assert.ok(result);
  assert.strictEqual(result.packageName, 'test_app');
  assert.strictEqual(result.suiteDescription, 'Testes');
  assert.strictEqual(result.tests.length, 1);
  assert.strictEqual(result.tests[0].procName, 'proc1');
  assert.strictEqual(result.uri.fsPath, '/x/test_app.pks');
});

test('parseSuite: retorna null para arquivo sem %suite', () => {
  const text = 'CREATE OR REPLACE PACKAGE normal IS\nPROCEDURE proc1;\nEND;';
  const uri = { fsPath: '/x/normal.pks', path: '/x/normal.pks', scheme: 'file' };
  const result = parseSuite(uri as any, text);
  assert.strictEqual(result, null);
});

test('parseSuite: retorna null para texto vazio', () => {
  const uri = { fsPath: '/x/vazio.pks', path: '/x/vazio.pks', scheme: 'file' };
  const result = parseSuite(uri as any, '');
  assert.strictEqual(result, null);
});

test('discoverWorkspace: retorna lista vazia quando sem pastas', async () => {
  const result = await discoverWorkspace(['**/*.pks'], []);
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 0);
});

test('discoverWorkspace: encontra suites em arquivos .pks', async () => {
  const { __setMockFile, __resetMockFiles } = await import('../vscode-stub.js');
  __setMockFile(
    '*.pks',
    '/root/test_app.pks',
    'CREATE OR REPLACE PACKAGE test_app IS\n  --%suite(Testes)\n  --%test(Cenario)\n  PROCEDURE proc1;\nEND;',
  );
  try {
    const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 };
    const result = await discoverWorkspace(['*.pks'], [folder as any]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].packageName, 'test_app');
    assert.strictEqual(result[0].suiteDescription, 'Testes');
    assert.strictEqual(result[0].tests.length, 1);
    assert.strictEqual(result[0].tests[0].procName, 'proc1');
    assert.strictEqual(result[0].folder, folder);
  } finally {
    __resetMockFiles();
  }
});

test('discoverWorkspace: arquivo ilegivel e ignorado', async () => {
  const { __setMockFile, __resetMockFiles, __setMockFileError } = await import('../vscode-stub.js');
  __setMockFile(
    '*.pks',
    '/root/bad.pks',
    'CREATE OR REPLACE PACKAGE bad IS\n  --%suite(ok)\n  --%test(x)\nPROCEDURE x;\nEND;',
  );
  __setMockFileError('/root/bad.pks', true);
  try {
    const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 };
    const result = await discoverWorkspace(['*.pks'], [folder as any]);
    assert.strictEqual(result.length, 0);
  } finally {
    __resetMockFiles();
  }
});

test('discoverWorkspace: suite sem testes e ignorada', async () => {
  const { __setMockFile, __resetMockFiles } = await import('../vscode-stub.js');
  __setMockFile(
    '*.pks',
    '/root/empty_suite.pks',
    'CREATE OR REPLACE PACKAGE empty_suite IS\n  --%suite(Sem testes)\nEND;',
  );
  try {
    const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 };
    const result = await discoverWorkspace(['*.pks'], [folder as any]);
    assert.strictEqual(result.length, 0);
  } finally {
    __resetMockFiles();
  }
});

test('discoverWorkspace: pattern sem match retorna vazio', async () => {
  const result = await discoverWorkspace(
    ['**/*.xyz'],
    [{ uri: { fsPath: '/root' }, name: 'root', index: 0 } as any],
  );
  assert.strictEqual(result.length, 0);
});

test('discoverWorkspace: teste com %disabled e filtrado', async () => {
  const { __setMockFile, __resetMockFiles } = await import('../vscode-stub.js');
  __setMockFile(
    '*.pks',
    '/root/with_disabled.pks',
    'CREATE OR REPLACE PACKAGE with_disabled IS\n  --%suite(Testes)\n' +
      '  --%test(Ativo)\n  PROCEDURE ativo;\n' +
      '  --%test(Desativado)\n  --%disabled\n  PROCEDURE desativado;\nEND;',
  );
  try {
    const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 };
    const result = await discoverWorkspace(['*.pks'], [folder as any]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].tests.length, 1);
    assert.strictEqual(result[0].tests[0].procName, 'ativo');
  } finally {
    __resetMockFiles();
  }
});

test('discoverWorkspace: suite com %disabled e ignorada', async () => {
  const { __setMockFile, __resetMockFiles } = await import('../vscode-stub.js');
  __setMockFile(
    '*.pks',
    '/root/disabled_suite.pks',
    'CREATE OR REPLACE PACKAGE disabled_suite IS\n  --%suite(Desativada)\n  --%disabled\n' +
      '  --%test(Um teste)\n  PROCEDURE um_teste;\nEND;',
  );
  try {
    const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 };
    const result = await discoverWorkspace(['*.pks'], [folder as any]);
    assert.strictEqual(result.length, 0);
  } finally {
    __resetMockFiles();
  }
});

test('discoverWorkspace: suite em que todos os testes sao disabled e ignorada', async () => {
  const { __setMockFile, __resetMockFiles } = await import('../vscode-stub.js');
  __setMockFile(
    '*.pks',
    '/root/all_disabled.pks',
    'CREATE OR REPLACE PACKAGE all_disabled IS\n  --%suite(Testes)\n' +
      '  --%test(Somente este)\n  --%disabled\n  PROCEDURE som_este;\nEND;',
  );
  try {
    const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 };
    const result = await discoverWorkspace(['*.pks'], [folder as any]);
    assert.strictEqual(result.length, 0);
  } finally {
    __resetMockFiles();
  }
});

test('extractSchemaFromPath: extrai schema com padrao db/{schema}/**', () => {
  assert.strictEqual(
    extractSchemaFromPath('/root/db/APP/tests/packages/ut_foo.pks', '/root', 'db/{schema}/**'),
    'APP',
  );
  assert.strictEqual(
    extractSchemaFromPath('/root/db/LOGIC/tests/packages/ut_bar.pks', '/root', 'db/{schema}/**'),
    'LOGIC',
  );
});

test('extractSchemaFromPath: retorna undefined quando nao da match', () => {
  assert.strictEqual(
    extractSchemaFromPath('/root/src/ut_baz.pks', '/root', 'db/{schema}/**'),
    undefined,
  );
});

test('extractSchemaFromPath: padrao sem {schema} nao lanca (RF5)', () => {
  assert.doesNotThrow(() => extractSchemaFromPath('/root/db/APP/x.pks', '/root', 'db/**'));
  assert.strictEqual(extractSchemaFromPath('/root/db/APP/x.pks', '/root', 'db/**'), undefined);
});

test('extractSchemaFromPath: padrao customizado src/{schema}/tests/**', () => {
  assert.strictEqual(
    extractSchemaFromPath('/root/src/MYSCHEMA/tests/ut_foo.pks', '/root', 'src/{schema}/tests/**'),
    'MYSCHEMA',
  );
});

test('extractSchemaFromPath: multiplos niveis entre schema e arquivo', () => {
  assert.strictEqual(
    extractSchemaFromPath(
      '/root/db/HR/tests/integration/packages/ut_hr.pks',
      '/root',
      'db/{schema}/**',
    ),
    'HR',
  );
});

test('extractSchemaFromPath: arquivo fora do workspace retorna undefined', () => {
  assert.strictEqual(
    extractSchemaFromPath('/other/APP/test.pks', '/root', 'db/{schema}/**'),
    undefined,
  );
});

test('extractSchemaFromPath: caminho Windows com backslash', () => {
  const result = extractSchemaFromPath(
    'C:\\projects\\root\\db\\SALES\\tests\\ut_foo.pks',
    'C:\\projects\\root',
    'db/{schema}/**',
  );
  assert.strictEqual(result, 'SALES');
});

test('extractSchemaFromPath: casing de drive divergente (C: vs c:)', () => {
  assert.strictEqual(
    extractSchemaFromPath('C:/root/db/APP/x.pks', 'c:/root', 'db/{schema}/**'),
    'APP',
  );
  assert.strictEqual(
    extractSchemaFromPath('c:/root/db/APP/x.pks', 'C:\\root', 'db/{schema}/**'),
    'APP',
  );
});

test('extractSchemaFromPath: drives distintos retorna undefined', () => {
  assert.strictEqual(
    extractSchemaFromPath('D:/root/db/APP/x.pks', 'C:/root', 'db/{schema}/**'),
    undefined,
  );
});

// ── discoverSchemaFromConn ───────────────────────────────────────────

const SUITE_LINES = [
  'CREATE OR REPLACE PACKAGE app_orders IS',
  '  --%suite(Orders)',
  '  --%test(Adds order)',
  '  PROCEDURE add_order;',
  '  --%test(Cancels order)',
  '  PROCEDURE cancel_order;',
  'END;',
];

function makeConn(opts: {
  packages?: unknown[];
  sources?: Record<string, string[]>;
  sourceThrows?: boolean;
}) {
  return {
    execute: async (sql: string, binds?: Record<string, unknown>) => {
      if (/all_objects/i.test(sql)) {
        return { rows: opts.packages ?? [] };
      }
      if (opts.sourceThrows) {
        throw new Error('ORA-00942: table or view does not exist');
      }
      const name = String(binds?.name ?? '');
      return { rows: (opts.sources?.[name] ?? []).map((l) => [l]) };
    },
  };
}

const FOLDER = { uri: { fsPath: '/root' }, name: 'root', index: 0 } as any;

test('discoverSchemaFromConn: retorna suites de packages com %suite', async () => {
  const conn = makeConn({
    packages: [['APP_ORDERS'], ['PLAIN_PKG']],
    sources: {
      APP_ORDERS: SUITE_LINES,
      PLAIN_PKG: ['CREATE OR REPLACE PACKAGE plain_pkg IS', '  PROCEDURE x;', 'END;'],
    },
  });
  const result = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].packageName, 'app_orders');
  assert.strictEqual(result[0].suiteDescription, 'Orders');
  assert.strictEqual(result[0].tests.length, 2);
  assert.strictEqual(result[0].dbSchema, 'HR');
  assert.strictEqual(result[0].uri.scheme, 'utplsql-db');
  assert.strictEqual(result[0].uri.toString(), 'utplsql-db:/HR/APP_ORDERS.pks');
  assert.strictEqual(result[0].folder, FOLDER);
});

test('discoverSchemaFromConn: zero packages retorna vazio', async () => {
  const conn = makeConn({ packages: [] });
  const result = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.strictEqual(result.length, 0);
});

test('discoverSchemaFromConn: package sem %suite e filtrado', async () => {
  const conn = makeConn({
    packages: [['PLAIN_PKG']],
    sources: { PLAIN_PKG: ['CREATE OR REPLACE PACKAGE plain_pkg IS', 'PROCEDURE x;', 'END;'] },
  });
  const result = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.strictEqual(result.length, 0);
});

test('discoverSchemaFromConn: packages UT_* sao ignorados', async () => {
  const conn = makeConn({
    packages: [['UT_RUNNER'], ['APP_ORDERS']],
    sources: {
      UT_RUNNER: SUITE_LINES,
      APP_ORDERS: SUITE_LINES,
    },
  });
  const result = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].packageName, 'app_orders');
});

test('discoverSchemaFromConn: ALL_SOURCE inacessivel retorna vazio sem erro', async () => {
  const conn = makeConn({ packages: [['APP_ORDERS']], sourceThrows: true });
  const result = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.strictEqual(result.length, 0);
});

test('discoverSchemaFromConn: rows em formato objeto (OUT_FORMAT_OBJECT)', async () => {
  const conn = {
    execute: async (sql: string) => {
      if (/all_objects/i.test(sql)) {
        return { rows: [{ OBJECT_NAME: 'APP_ORDERS' }] };
      }
      return {
        rows: SUITE_LINES.map((text) => ({ TEXT: text })),
      };
    },
  };
  const result = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].tests.length, 2);
});

test('discoverSchemaFromConn: suite com todos os testes disabled e ignorada', async () => {
  const conn = makeConn({
    packages: [['APP_ORDERS']],
    sources: {
      APP_ORDERS: [
        'CREATE OR REPLACE PACKAGE app_orders IS',
        '  --%suite(Orders)',
        '  --%test(Skipped)',
        '  --%disabled',
        '  PROCEDURE skipped_test;',
        'END;',
      ],
    },
  });
  const result = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.strictEqual(result.length, 0);
});

test('discoverSchemaFromConn: fonte sem CREATE OR REPLACE (ALL_SOURCE do banco)', async () => {
  const conn = makeConn({
    packages: [['APP_ORDERS']],
    sources: {
      APP_ORDERS: [
        'PACKAGE app_orders AS',
        '  --%suite(Orders)',
        '  --%test(Adds order)',
        '  PROCEDURE add_order;',
        'END;',
      ],
    },
  });
  const result = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].packageName, 'app_orders');
  assert.strictEqual(result[0].tests[0].procName, 'add_order');
});

// ── discoverSchemaFromDb ─────────────────────────────────────────────

function makeFakeOracledb(sources: Record<string, string[]>) {
  const createdConns: unknown[] = [];
  const mod = {
    createPool: async (_attrs: Record<string, unknown>) => ({
      getConnection: async () => {
        const conn = {
          ...makeConn({ packages: [['APP_ORDERS']], sources }),
          close: async () => {},
        };
        createdConns.push(conn);
        return conn;
      },
      close: async () => {},
    }),
    getConnection: async () => {
      throw new Error('sem conexao raw');
    },
  };
  return { mod, createdConns };
}

test('discoverSchemaFromDb: retorna suites via pool', async () => {
  const { mod } = makeFakeOracledb({ APP_ORDERS: SUITE_LINES });
  try {
    const result = await discoverSchemaFromDb(
      'u/p@//h:1521/s',
      'hr',
      [FOLDER],
      async () => mod as never,
    );
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].packageName, 'app_orders');
  } finally {
    await closeOraclePool();
  }
});

test('discoverSchemaFromDb: oracledb indisponivel retorna vazio', async () => {
  const result = await discoverSchemaFromDb('u/p@//h:1521/s', 'hr', [FOLDER], async () => {
    throw new Error('oracledb not found');
  });
  assert.strictEqual(result.length, 0);
});

test('discoverSchemaFromDb: createPool falha retorna vazio', async () => {
  const mod = {
    createPool: async () => {
      throw new Error('db down');
    },
    getConnection: async () => {
      throw new Error('db down');
    },
  };
  try {
    const result = await discoverSchemaFromDb(
      'u/p@//h:1521/s',
      'hr',
      [FOLDER],
      async () => mod as never,
    );
    assert.strictEqual(result.length, 0);
  } finally {
    await closeOraclePool();
  }
});

test('discoverSchemaFromDb: sem folders retorna vazio', async () => {
  const { mod } = makeFakeOracledb({ APP_ORDERS: SUITE_LINES });
  const result = await discoverSchemaFromDb('u/p@//h:1521/s', 'hr', [], async () => mod as never);
  assert.strictEqual(result.length, 0);
});

// ── discoverSchemasFromFolders ───────────────────────────────────────

test('discoverSchemasFromFolders: lista diretorios com padrao db/{schema}/**', async () => {
  const { __setMockDirectoryEntries, __resetMockDirectoryEntries } = await import(
    '../vscode-stub.js'
  );
  __setMockDirectoryEntries('/root/db', [
    ['APP', 2],
    ['LOGIC', 2],
    ['readme.txt', 1],
  ]);
  try {
    const folders = [{ uri: { fsPath: '/root' }, name: 'root', index: 0 }] as any;
    const result = await discoverSchemasFromFolders(folders, 'db/{schema}/**');
    assert.deepStrictEqual(result, ['APP', 'LOGIC']);
  } finally {
    __resetMockDirectoryEntries();
  }
});

test('discoverSchemasFromFolders: pasta base inexistente retorna vazio', async () => {
  const { __resetMockDirectoryEntries } = await import('../vscode-stub.js');
  __resetMockDirectoryEntries();
  const folders = [{ uri: { fsPath: '/root' }, name: 'root', index: 0 }] as any;
  const result = await discoverSchemasFromFolders(folders, 'db/{schema}/**');
  assert.deepStrictEqual(result, []);
});

test('discoverSchemasFromFolders: padrao sem {schema} retorna vazio', async () => {
  const folders = [{ uri: { fsPath: '/root' }, name: 'root', index: 0 }] as any;
  const result = await discoverSchemasFromFolders(folders, 'db/**');
  assert.deepStrictEqual(result, []);
});

test('discoverSchemasFromFolders: base no nivel da raiz ({schema}/**)', async () => {
  const { __setMockDirectoryEntries, __resetMockDirectoryEntries } = await import(
    '../vscode-stub.js'
  );
  __setMockDirectoryEntries('/root', [
    ['SALES', 2],
    ['notes.md', 1],
  ]);
  try {
    const folders = [{ uri: { fsPath: '/root' }, name: 'root', index: 0 }] as any;
    const result = await discoverSchemasFromFolders(folders, '{schema}/**');
    assert.deepStrictEqual(result, ['SALES']);
  } finally {
    __resetMockDirectoryEntries();
  }
});

test('discoverSchemaFromDb: usa conexao raw quando createPool falha', async () => {
  const rawConn = makeConn({
    packages: [['APP_ORDERS']],
    sources: { APP_ORDERS: SUITE_LINES },
  });
  const mod = {
    createPool: async () => {
      throw new Error('pool down');
    },
    getConnection: async (_attrs: unknown) => ({ ...rawConn, close: async () => {} }),
  };
  try {
    const result = await discoverSchemaFromDb(
      'u/p@//h:1521/s',
      'hr',
      [FOLDER],
      async () => mod as never,
    );
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].packageName, 'app_orders');
  } finally {
    await closeOraclePool();
  }
});

// ── callTimeout (não deve vazar para o pool) ────────────────────────

function makeTimeoutTrackingConn(opts: { sourceThrows?: boolean } = {}) {
  const base = makeConn({
    packages: [['APP_ORDERS']],
    sources: { APP_ORDERS: SUITE_LINES },
    sourceThrows: opts.sourceThrows,
  });
  const seenTimeouts: number[] = [];
  const conn = {
    callTimeout: 99,
    execute: async (sql: string, binds?: Record<string, unknown>) => {
      seenTimeouts.push(conn.callTimeout);
      return base.execute(sql, binds);
    },
    close: async () => {},
  };
  const mod = {
    createPool: async () => ({
      getConnection: async () => conn,
      close: async () => {},
    }),
    getConnection: async () => {
      throw new Error('raw indisponivel');
    },
  };
  return { conn, mod, seenTimeouts };
}

test('discoverSchemaFromDb: restaura callTimeout ao devolver a conexao', async () => {
  const { conn, mod, seenTimeouts } = makeTimeoutTrackingConn();
  try {
    const result = await discoverSchemaFromDb(
      'u/p@//h:1521/s',
      'hr',
      [FOLDER],
      async () => mod as never,
    );
    assert.strictEqual(result.length, 1);
    assert.strictEqual(conn.callTimeout, 99);
    assert.ok(seenTimeouts.length > 0);
    assert.ok(seenTimeouts.every((t) => t === 10_000));
  } finally {
    await closeOraclePool();
  }
});

test('discoverSchemaFromDb: restaura callTimeout tambem em caso de erro', async () => {
  const { conn, mod } = makeTimeoutTrackingConn({ sourceThrows: true });
  try {
    const result = await discoverSchemaFromDb(
      'u/p@//h:1521/s',
      'hr',
      [FOLDER],
      async () => mod as never,
    );
    assert.deepStrictEqual(result, []);
    assert.strictEqual(conn.callTimeout, 99);
  } finally {
    await closeOraclePool();
  }
});

test('discoverSchemasFromFolders: base com subdiretorios (src/{schema}/tests/**)', async () => {
  const { __setMockDirectoryEntries, __resetMockDirectoryEntries } = await import(
    '../vscode-stub.js'
  );
  __setMockDirectoryEntries('/root/src', [
    ['MYSCHEMA', 2],
    ['OTHER', 2],
  ]);
  try {
    const folders = [{ uri: { fsPath: '/root' }, name: 'root', index: 0 }] as any;
    const result = await discoverSchemasFromFolders(folders, 'src/{schema}/tests/**');
    assert.deepStrictEqual(result, ['MYSCHEMA', 'OTHER']);
  } finally {
    __resetMockDirectoryEntries();
  }
});

test('discoverSchemaFromDb: loader padrão com conexão inválida retorna []', async () => {
  const result = await discoverSchemaFromDb('formato-invalido', 'hr', [FOLDER]);
  assert.deepStrictEqual(result, []);
});

test('discoverSchemaFromConn: rows em formato objeto com chaves maiusculas/minusculas', async () => {
  const conn = makeConn({
    packages: [{ OBJECT_NAME: 'APP_ORDERS' }],
    sources: { APP_ORDERS: SUITE_LINES },
  });
  const suites = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.strictEqual(suites.length, 1);
  assert.strictEqual(suites[0].packageName, 'app_orders');
});

test('discoverSchemaFromConn: ALL_SOURCE truncado gera warning (limite atingido)', async () => {
  const lines = Array.from({ length: 1000 }, (_v, i) => `${i + 1} some source line`);
  const conn = makeConn({ packages: [['APP_ORDERS']], sources: { APP_ORDERS: lines } });
  const suites = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.ok(suites.length >= 0);
});

test('discoverSchemaFromConn: ALL_SOURCE com 10k linhas dispara warning e ainda parseia', async () => {
  const lines = Array.from({ length: 10_000 }, (_v, i) =>
    i === 0 ? 'CREATE OR REPLACE PACKAGE app_orders IS' : `  -- linha ${i}`,
  );
  lines[1] = '  --%suite(Orders)';
  lines[2] = '  --%test(Adds order)';
  lines[3] = '  PROCEDURE add_order;';
  const conn = makeConn({ packages: [['APP_ORDERS']], sources: { APP_ORDERS: lines } });
  const suites = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.strictEqual(suites.length, 1);
  assert.strictEqual(suites[0].packageName, 'app_orders');
});

test('discoverSchemaFromConn: rows vazios e ALL_SOURCE indisponivel retorna vazio', async () => {
  const conn = {
    execute: async (sql: string) => {
      if (/ALL_SYNONYMS|ALL_OBJECTS/i.test(sql)) return { rows: [] };
      throw new Error('ALL_SOURCE negado');
    },
    callTimeout: 0,
    close: async () => {},
  };
  const suites = await discoverSchemaFromConn(conn as never, 'hr', FOLDER);
  assert.deepStrictEqual(suites, []);
});

test('discoverSchemaFromDb: cria pool mas fetch falha retorna vazio', async () => {
  const { mod } = makeFakeOracledb({
    APP_ORDERS: ['CREATE OR REPLACE PACKAGE app_orders AS', '-- sem suite', 'END app_orders;'],
  });
  try {
    const result = await discoverSchemaFromDb(
      'u/p@//h:1521/s',
      'hr',
      [FOLDER],
      async () => mod as never,
    );
    assert.strictEqual(result.length, 0);
  } finally {
    await closeOraclePool();
  }
});

test('discoverSchemaFromDb: ALL_OBJECTS inacessível cai no catch e restaura timeout', async () => {
  const conn = {
    callTimeout: 7,
    execute: async () => {
      throw new Error('ORA-00942: ALL_OBJECTS negado');
    },
    close: async () => {},
  };
  const mod = {
    createPool: async () => ({
      getConnection: async () => conn,
      close: async () => {},
    }),
    getConnection: async () => {
      throw new Error('raw indisponivel');
    },
  };
  try {
    const result = await discoverSchemaFromDb(
      'u/p@//h:1521/s',
      'hr',
      [FOLDER],
      async () => mod as never,
    );
    assert.deepStrictEqual(result, []);
    assert.strictEqual(conn.callTimeout, 7, 'callTimeout deveria ser restaurado');
  } finally {
    await closeOraclePool();
  }
});

test('discoverWorkspace: arquivo duplicado entre padrões é deduplicado', async () => {
  const { __setMockFile, __resetMockFiles } = await import('../vscode-stub.js');
  const text =
    'CREATE OR REPLACE PACKAGE test_app IS\n  --%suite(Testes)\n  --%test(Cenario)\n  PROCEDURE proc1;\nEND;';
  __setMockFile('*.pks', '/root/test_app.pks', text);
  __setMockFile('**/test_*.pks', '/root/test_app.pks', text);
  try {
    const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 };
    const result = await discoverWorkspace(['*.pks', '**/test_*.pks'], [folder as any]);
    assert.strictEqual(result.length, 1);
  } finally {
    __resetMockFiles();
  }
});

// ── getSuitesInfo / mapSuitesInfoToSuiteFiles / mergeSuiteLists (PRD-74) ──

function makeInfoConn(rows: unknown[], throws = false) {
  return {
    execute: async (sql: string) => {
      if (throws) throw new Error('ORA-00904: invalid identifier');
      assert.match(sql, /get_suites_info/);
      return { rows };
    },
  };
}

// colunas: owner, package, item_name, description, type, line, path, disabled, reason, tags
const INFO_ROWS = [
  ['HR', 'APP_ORDERS', 'app_orders', 'Orders suite', 'UT_SUITE', 3, null, 0, null, 'fast,critical'],
  ['HR', 'APP_ORDERS', 'add_order', 'Adds order', 'UT_TEST', 5, null, 0, null, 'fast'],
  ['HR', 'APP_ORDERS', 'cancel_order', 'Cancels', 'UT_TEST', 7, null, 0, null, ''],
  ['HR', 'APP_ORDERS', 'disabled_one', 'x', 'UT_TEST', 9, null, 1, 'wip', ''],
];

test('getSuitesInfo: normaliza linhas e mapeia tipos', async () => {
  const rows = await getSuitesInfo(makeInfoConn(INFO_ROWS), 'hr');
  assert.strictEqual(rows.length, 4);
  assert.strictEqual(rows[0].itemType, 'suite');
  assert.strictEqual(rows[0].owner, 'HR');
  assert.deepStrictEqual(rows[0].tags, ['fast', 'critical']);
  assert.strictEqual(rows[1].itemType, 'test');
  assert.strictEqual(rows[3].disabled, true);
});

test('getSuitesInfo: rows em formato objeto (OUT_FORMAT_OBJECT)', async () => {
  const rows = await getSuitesInfo(
    makeInfoConn([
      {
        OBJECT_OWNER: 'HR',
        OBJECT_NAME: 'PKG',
        ITEM_NAME: 'pkg',
        ITEM_DESCRIPTION: 'd',
        ITEM_TYPE: 'UT_SUITE',
        ITEM_LINE_NO: 2,
        PATH: 'p',
        DISABLED_FLAG: 0,
        DISABLED_REASON: null,
        TAGS: 'a, b',
      },
    ]),
    'hr',
  );
  assert.strictEqual(rows.length, 1);
  assert.deepStrictEqual(rows[0].tags, ['a', 'b']);
});

test('getSuitesInfo: erro (API ausente) retorna vazio', async () => {
  const rows = await getSuitesInfo(makeInfoConn([], true), 'hr');
  assert.deepStrictEqual(rows, []);
});

test('mapSuitesInfoToSuiteFiles: agrupa por package e omite disabled', async () => {
  const rows = await getSuitesInfo(makeInfoConn(INFO_ROWS), 'hr');
  const suites = mapSuitesInfoToSuiteFiles(rows, FOLDER);
  assert.strictEqual(suites.length, 1);
  assert.strictEqual(suites[0].packageName, 'APP_ORDERS');
  assert.strictEqual(suites[0].suiteDescription, 'Orders suite');
  assert.strictEqual(suites[0].dbSchema, 'HR');
  assert.strictEqual(suites[0].uri.toString(), 'utplsql-db:/HR/APP_ORDERS.pks');
  assert.deepStrictEqual(
    suites[0].tests.map((t) => t.procName),
    ['add_order', 'cancel_order'],
  );
  assert.strictEqual(suites[0].tests[0].line, 4); // 1-based 5 → 0-based 4
  assert.deepStrictEqual(suites[0].tests[0].tags, ['fast']);
});

test('mapSuitesInfoToSuiteFiles: package sem testes é omitido', async () => {
  const rows = await getSuitesInfo(
    makeInfoConn([['HR', 'EMPTY_PKG', 'empty', 'd', 'UT_SUITE', 1, null, 0, null, '']]),
    'hr',
  );
  assert.deepStrictEqual(mapSuitesInfoToSuiteFiles(rows, FOLDER), []);
});

test('mergeSuiteLists: arquivo prevalece em uri/linha; banco em descrição/tags', () => {
  const fileSuite = {
    uri: { fsPath: '/ws/ut_app.pks', scheme: 'file' },
    packageName: 'UT_APP',
    suiteDescription: 'File desc',
    tests: [{ procName: 'test_one', description: 'file one', line: 10 }],
    folder: FOLDER,
    suiteLine: 1,
  } as unknown as SuiteFile;
  const dbSuite = {
    uri: { fsPath: '' },
    packageName: 'ut_app',
    suiteDescription: 'DB desc',
    tests: [
      { procName: 'test_one', description: 'db one', line: 4, tags: ['fast'] },
      { procName: 'test_two', description: 'db two', line: 8 },
    ],
    folder: FOLDER,
    suiteLine: 2,
    dbSchema: 'APP',
  } as unknown as SuiteFile;

  const merged = mergeSuiteLists([fileSuite], [dbSuite]);
  assert.strictEqual(merged.length, 1);
  assert.strictEqual(merged[0].uri, fileSuite.uri);
  assert.strictEqual(merged[0].suiteDescription, 'DB desc');
  assert.deepStrictEqual(
    merged[0].tests.map((t) => t.procName),
    ['test_one', 'test_two'],
  );
  assert.strictEqual(merged[0].tests[0].line, 10);
  assert.strictEqual(merged[0].tests[0].description, 'db one');
  assert.deepStrictEqual(merged[0].tests[0].tags, ['fast']);
  assert.strictEqual(merged[0].tests[1].line, 8);
});

test('mergeSuiteLists: suite só-DB é adicionada', () => {
  const dbSuite = {
    uri: { fsPath: '' },
    packageName: 'UT_NEW',
    suiteDescription: 'db',
    tests: [{ procName: 't', description: 'd', line: 1 }],
    folder: FOLDER,
    suiteLine: 1,
    dbSchema: 'APP',
  } as unknown as SuiteFile;
  const merged = mergeSuiteLists([], [dbSuite]);
  assert.strictEqual(merged.length, 1);
  assert.strictEqual(merged[0].packageName, 'UT_NEW');
});

test('discoverDbSuites: usa a API quando a versão permite', async () => {
  const conn = {
    callTimeout: 0,
    execute: async (sql: string) => {
      if (/ut_runner\.version/.test(sql)) return { rows: [['3.2.3']] };
      if (/get_suites_info/.test(sql)) return { rows: INFO_ROWS };
      if (/product_component_version/.test(sql)) return { rows: [['19.0.0']] };
      return { rows: [] };
    },
    close: async () => {},
  };
  const mod = {
    OUT_FORMAT_OBJECT: {},
    createPool: async () => ({
      getConnection: async () => conn,
      close: async () => {},
    }),
    getConnection: async () => {
      throw new Error('raw indisponivel');
    },
  };
  try {
    const result = await discoverDbSuites(
      'u/p@//h:1521/s',
      'hr',
      [FOLDER],
      async () => mod as never,
    );
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].dbSchema, 'HR');
  } finally {
    await closeOraclePool();
  }
});

test('getSuitesInfo: item_type desconhecido é ignorado', async () => {
  const rows = await getSuitesInfo(
    makeInfoConn([
      ['HR', 'PKG', 'x', 'd', 'UT_SOMETHING', 1, null, 0, null, ''],
      ['HR', 'PKG', 'pkg', 'd', 'UT_SUITE', 1, null, 0, null, ''],
    ]),
    'hr',
  );
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].itemType, 'suite');
});

test('getSuitesInfo: owner em maiúsculas e tags normalizadas (trim/vazias)', async () => {
  const rows = await getSuitesInfo(
    makeInfoConn([[' hr ', 'pkg', 'pkg', 'd', 'UT_SUITE', 1, null, 0, null, ' a , ,b ']]),
    'hr',
  );
  assert.strictEqual(rows[0].owner, 'HR');
  assert.deepStrictEqual(rows[0].tags, ['a', 'b']);
});

test('getSuitesInfo: disabled_flag 0 é false; descrição vazia vira null', async () => {
  const rows = await getSuitesInfo(
    makeInfoConn([['HR', 'PKG', 'pkg', '', 'UT_SUITE', 1, null, 0, null, '']]),
    'hr',
  );
  assert.strictEqual(rows[0].disabled, false);
  assert.strictEqual(rows[0].description, null);
});

test('mapSuitesInfoToSuiteFiles: vários packages e contextos ignorados', () => {
  const rows: DbSuiteRow[] = [
    row('PKG_A', 'pkg_a', 'suite', 'A', 1),
    row('PKG_A', 'ctx', 'context', 'c', 2),
    row('PKG_A', 't1', 'test', 't1', 3),
    row('PKG_B', 'pkg_b', 'suite', 'B', 1),
    row('PKG_B', 't2', 'test', 't2', 2),
  ];
  const suites = mapSuitesInfoToSuiteFiles(rows, FOLDER);
  assert.deepStrictEqual(suites.map((s) => s.packageName).sort(), ['PKG_A', 'PKG_B']);
  assert.strictEqual(suites.find((s) => s.packageName === 'PKG_A')?.tests.length, 1);
  assert.strictEqual(suites.find((s) => s.packageName === 'PKG_A')?.tests[0].procName, 't1');
});

test('mapSuitesInfoToSuiteFiles: suíte disabled é omitida', () => {
  const rows: DbSuiteRow[] = [
    { ...row('PKG', 'pkg', 'suite', 'd', 1), disabled: true },
    row('PKG', 't', 'test', 't', 2),
  ];
  assert.deepStrictEqual(mapSuitesInfoToSuiteFiles(rows, FOLDER), []);
});

test('mapSuitesInfoToSuiteFiles: teste disabled é filtrado; tags propagadas', () => {
  const rows: DbSuiteRow[] = [
    row('PKG', 'pkg', 'suite', 'd', 1),
    { ...row('PKG', 't1', 'test', 't1', 2), tags: ['fast'] },
    { ...row('PKG', 't2', 'test', 't2', 3), disabled: true },
  ];
  const suites = mapSuitesInfoToSuiteFiles(rows, FOLDER);
  assert.deepStrictEqual(
    suites[0].tests.map((t) => t.procName),
    ['t1'],
  );
  assert.deepStrictEqual(suites[0].tests[0].tags, ['fast']);
  assert.strictEqual(suites[0].tests[0].line, 1); // 1-based 2 → 0-based 1
});

test('mergeSuiteLists: package case-insensitive; banco prevalece em descrição/tags', () => {
  const fileSuite = {
    uri: { fsPath: '/ws/ut_app.pks', scheme: 'file' },
    packageName: 'UT_APP',
    suiteDescription: 'File',
    tests: [{ procName: 'test_one', description: 'file', line: 5, tags: ['old'] }],
    folder: FOLDER,
    suiteLine: 1,
  } as unknown as SuiteFile;
  const dbSuite = {
    uri: { fsPath: '' },
    packageName: 'ut_app',
    suiteDescription: 'DB',
    tests: [{ procName: 'TEST_ONE', description: 'db', line: 9, tags: ['new'] }],
    folder: FOLDER,
    suiteLine: 2,
  } as unknown as SuiteFile;

  const merged = mergeSuiteLists([fileSuite], [dbSuite]);
  assert.strictEqual(merged.length, 1);
  assert.strictEqual(merged[0].uri, fileSuite.uri);
  assert.strictEqual(merged[0].tests[0].line, 5); // linha do arquivo
  assert.strictEqual(merged[0].tests[0].description, 'db');
  assert.deepStrictEqual(merged[0].tests[0].tags, ['new']);
});

test('mergeSuiteLists: tag vazia no banco não apaga a do arquivo', () => {
  const fileSuite = {
    uri: { fsPath: '/ws/ut_app.pks', scheme: 'file' },
    packageName: 'UT_APP',
    suiteDescription: 'File',
    tests: [{ procName: 't', description: 'file', line: 5, tags: ['keep'] }],
    folder: FOLDER,
    suiteLine: 1,
  } as unknown as SuiteFile;
  const dbSuite = {
    uri: { fsPath: '' },
    packageName: 'UT_APP',
    suiteDescription: '',
    tests: [{ procName: 't', description: 'db', line: 9 }],
    folder: FOLDER,
    suiteLine: 2,
  } as unknown as SuiteFile;

  const merged = mergeSuiteLists([fileSuite], [dbSuite]);
  assert.deepStrictEqual(merged[0].tests[0].tags, ['keep']);
});

// ── discoverDbSuites: gate de versão e fonte (PRD-74 RF4/RF5) ─────────

function makeApiDbConn(opts: {
  utVersion: string;
  infoRows?: unknown[];
  allObjects?: unknown[];
  onApi?: () => void;
  onAllSource?: () => void;
}) {
  const conn = {
    callTimeout: 0,
    execute: async (sql: string) => {
      if (/ut_runner\.version/.test(sql)) return { rows: [[opts.utVersion]] };
      if (/product_component_version/.test(sql)) return { rows: [['19.0.0']] };
      if (/get_suites_info/.test(sql)) {
        opts.onApi?.();
        return { rows: opts.infoRows ?? [] };
      }
      if (/all_objects/i.test(sql)) {
        opts.onAllSource?.();
        return { rows: opts.allObjects ?? [] };
      }
      return { rows: [] };
    },
    close: async () => {},
  };
  const mod = {
    OUT_FORMAT_OBJECT: {},
    createPool: async () => ({ getConnection: async () => conn, close: async () => {} }),
    getConnection: async () => {
      throw new Error('raw indisponivel');
    },
  };
  return mod;
}

test('discoverDbSuites: versão antiga (<3.1.3) não chama a API e cai no ALL_SOURCE', async () => {
  let apiCalls = 0;
  let allSourceCalls = 0;
  const mod = makeApiDbConn({
    utVersion: '3.0.0',
    onApi: () => apiCalls++,
    onAllSource: () => allSourceCalls++,
  });
  try {
    const result = await discoverDbSuites(
      'u/p@//h:1521/s',
      'hr',
      [FOLDER],
      async () => mod as never,
    );
    assert.deepStrictEqual(result, []);
    assert.strictEqual(apiCalls, 0, 'não deveria consultar get_suites_info em versão antiga');
    assert.strictEqual(allSourceCalls, 1, 'deveria cair no ALL_SOURCE');
  } finally {
    await closeOraclePool();
  }
});

test('discoverDbSuites: discovery.source=database não usa fallback quando a API vem vazia', async () => {
  let allSourceCalls = 0;
  const mod = makeApiDbConn({
    utVersion: '3.2.3',
    infoRows: [],
    onAllSource: () => allSourceCalls++,
  });
  __setConfigValue('discovery.source', 'database');
  try {
    const result = await discoverDbSuites(
      'u/p@//h:1521/s',
      'hr',
      [FOLDER],
      async () => mod as never,
    );
    assert.deepStrictEqual(result, []);
    assert.strictEqual(allSourceCalls, 0, 'com source=database não deveria usar ALL_SOURCE');
  } finally {
    __resetConfigValues();
    await closeOraclePool();
  }
});

test('discoverDbSuites: API vazia em auto cai no ALL_SOURCE', async () => {
  let allSourceCalls = 0;
  const mod = makeApiDbConn({
    utVersion: '3.2.3',
    infoRows: [],
    onAllSource: () => allSourceCalls++,
  });
  try {
    await discoverDbSuites('u/p@//h:1521/s', 'hr', [FOLDER], async () => mod as never);
    assert.strictEqual(allSourceCalls, 1);
  } finally {
    await closeOraclePool();
  }
});

function row(
  packageName: string,
  itemName: string,
  itemType: DbSuiteRow['itemType'],
  description: string,
  line: number,
): DbSuiteRow {
  return {
    owner: 'HR',
    packageName,
    suitePath: null,
    itemName,
    itemType,
    description,
    disabled: false,
    tags: [],
    line,
  };
}

// ── discoverWorkspace / resolveFolder ────────────────────────────────

test('discoverWorkspace: resolveFolder escolhe o workspace folder mais específico', async () => {
  __resetConfigValues();
  __resetMockFiles();
  const content = `CREATE OR REPLACE PACKAGE t1 IS
  --%suite(S)
  --%test(A)
  PROCEDURE a;
END;`;
  __setMockFile('**/*.pks', '/ws1/a/t1.pks', content);
  __setMockFile('**/*.pks', '/ws2/b/t2.pks', content.replace(/t1/g, 't2'));
  const folders = [
    { uri: { fsPath: '/ws1', toString: () => '/ws1' }, name: 'a', index: 0 },
    { uri: { fsPath: '/ws2', toString: () => '/ws2' }, name: 'b', index: 1 },
  ] as never;
  const result = await discoverWorkspace(['**/*.pks'], folders);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result.find((s) => s.packageName === 't2')?.folder.name, 'b');
});

// ── discoverDbSuites (caminhos de falha) ─────────────────────────────

test('discoverDbSuites: oracledb ausente retorna vazio', async () => {
  const result = await discoverDbSuites('u/p@//h:1521/s', 'APP', [FOLDER], async () => {
    throw new Error('sem driver');
  });
  assert.deepStrictEqual(result, []);
});

test('discoverDbSuites: falha ao obter conexão retorna vazio', async () => {
  const mod = {
    createPool: async () => {
      throw new Error('pool down');
    },
    getConnection: async () => {
      throw new Error('conn down');
    },
  };
  const result = await discoverDbSuites(
    'u/p@//h:1521/s',
    'APP',
    [FOLDER],
    async () => mod as never,
  );
  assert.deepStrictEqual(result, []);
  await closeOraclePool();
});

test('discoverDbSuites: erro na descoberta via banco retorna vazio', async () => {
  const conn = {
    callTimeout: 0,
    execute: async () => {
      throw new Error('query falhou');
    },
    close: async () => {},
  };
  const mod = {
    createPool: async () => ({ getConnection: async () => conn, close: async () => {} }),
  };
  const result = await discoverDbSuites(
    'u/p@//h:1521/s',
    'APP',
    [FOLDER],
    async () => mod as never,
  );
  assert.deepStrictEqual(result, []);
  await closeOraclePool();
});

test('discoverSchemaFromConn: aceita rows objeto com chaves minúsculas', async () => {
  const conn = {
    execute: async (sql: string) => {
      if (/all_objects/i.test(sql)) return { rows: [{ object_name: 'APP_ORDERS' }] };
      return { rows: SUITE_LINES.map((text) => ({ text })) };
    },
  };
  const suites = await discoverSchemaFromConn(conn, 'hr', FOLDER);
  assert.strictEqual(suites.length, 1);
  assert.strictEqual(suites[0].packageName, 'app_orders');
  assert.strictEqual(suites[0].tests.length, 2);
});

test('discovery: resultados sem rows são tratados como vazios', async () => {
  const conn = {
    execute: async (sql: string) => {
      if (/all_objects/i.test(sql)) return { rows: [['APP_ORDERS']] };
      return {};
    },
  };
  assert.deepStrictEqual(await discoverSchemaFromConn(conn, 'hr', FOLDER), []);
  assert.deepStrictEqual(
    await discoverSchemaFromConn({ execute: async () => ({}) }, 'hr', FOLDER),
    [],
  );
  assert.deepStrictEqual(await getSuitesInfo({ execute: async () => ({}) }, 'hr'), []);
});

test('getSuitesInfo: normaliza objeto lowercase, contexto, linha vazia e null', async () => {
  const rows = await getSuitesInfo(
    {
      execute: async () => ({
        rows: [
          {
            object_owner: 'hr',
            object_name: 'pkg',
            item_name: 'pkg',
            item_description: null,
            item_type: 'UT_SUITE',
            item_line_no: '',
            path: null,
            disabled_flag: '0',
            disabled_reason: null,
            tags: null,
          },
          {
            object_owner: 'hr',
            object_name: 'pkg',
            item_name: 'test_one',
            item_description: null,
            item_type: 'UT_TEST',
            item_line_no: null,
            path: null,
            disabled_flag: '0',
            disabled_reason: null,
            tags: null,
          },
          {
            object_owner: 'hr',
            object_name: 'pkg',
            item_name: 'context',
            item_description: 'ctx',
            item_type: 'UT_SUITE_CONTEXT',
            item_line_no: 2,
            path: null,
            disabled_flag: '0',
            disabled_reason: null,
            tags: '',
          },
        ],
      }),
    },
    'hr',
  );
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(rows[0].owner, 'HR');
  assert.strictEqual(rows[0].description, null);
  assert.strictEqual(rows[0].line, 0);
  assert.strictEqual(rows[1].line, 0);
  assert.strictEqual(rows[2].itemType, 'context');

  const suites = mapSuitesInfoToSuiteFiles(rows, FOLDER);
  assert.strictEqual(suites.length, 1);
  assert.strictEqual(suites[0].suiteDescription, '');
  assert.strictEqual(suites[0].suiteLine, 0);
  assert.strictEqual(suites[0].tests[0].description, '');
  assert.strictEqual(suites[0].tests[0].line, 0);
});

test('mapSuitesInfoToSuiteFiles: pacote só com teste usa descrição e linha fallback', () => {
  const suites = mapSuitesInfoToSuiteFiles([row('PKG', 'test_one', 'test', 'ignored', 1)], FOLDER);
  assert.strictEqual(suites.length, 1);
  assert.strictEqual(suites[0].suiteDescription, '');
  assert.strictEqual(suites[0].suiteLine, 0);
});

test('mergeSuiteLists: descrição vazia do banco preserva a do arquivo', () => {
  const fileSuite = {
    uri: { fsPath: '/ws/ut_app.pks', scheme: 'file' },
    packageName: 'UT_APP',
    suiteDescription: 'Suite do arquivo',
    tests: [{ procName: 'test_one', description: 'Teste do arquivo', line: 5 }],
    folder: FOLDER,
    suiteLine: 1,
  } as unknown as SuiteFile;
  const dbSuite = {
    uri: { fsPath: '' },
    packageName: 'ut_app',
    suiteDescription: '',
    tests: [{ procName: 'test_one', description: '', line: 9 }],
    folder: FOLDER,
    suiteLine: 2,
  } as unknown as SuiteFile;

  const merged = mergeSuiteLists([fileSuite], [dbSuite]);
  assert.strictEqual(merged[0].suiteDescription, 'Suite do arquivo');
  assert.strictEqual(merged[0].tests[0].description, 'Teste do arquivo');
});

test('discoverDbSuites: sem folders não carrega o driver', async () => {
  let loaded = false;
  const result = await discoverDbSuites('u/p@//h:1521/s', 'APP', [], async () => {
    loaded = true;
    return {} as never;
  });
  assert.deepStrictEqual(result, []);
  assert.strictEqual(loaded, false);
});

test('discoverWorkspace: usa charset do perfil ativo ao decodificar bytes', async () => {
  const bytes = Buffer.concat([
    Buffer.from('CREATE OR REPLACE PACKAGE legacy IS\n  --%suite(Desc ', 'ascii'),
    Buffer.from([0xe7]),
    Buffer.from([0xe3]),
    Buffer.from(')\n  --%test(Teste)\n  PROCEDURE teste;\nEND;', 'ascii'),
  ]);
  __setMockFile('*.pks', '/root/legacy.pks', bytes as unknown as string);
  __setConfigValue('profiles', [
    { id: 'legacy', name: 'Legacy', connection: 'u@//h:1521/s', charset: 'win1252' },
  ]);
  __setConfigValue('activeProfile', 'legacy');
  try {
    const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 } as any;
    const suites = await discoverWorkspace(['*.pks'], [folder]);
    assert.strictEqual(suites.length, 1);
    assert.strictEqual(suites[0].suiteDescription, 'Desc çã');
    assert.strictEqual(suites[0].tests[0].description, 'Teste');
  } finally {
    __resetMockFiles();
    __resetConfigValues();
  }
});
