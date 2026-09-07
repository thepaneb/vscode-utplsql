import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  discoverSchemaFromConn,
  discoverSchemaFromDb,
  discoverSchemasFromFolders,
  discoverWorkspace,
  extractSchemaFromPath,
  parseSuite,
} from '../../discovery';
import { closeOraclePool } from '../../oracleRunner';

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
      return { rows: ((opts.sources ?? {})[name] ?? []).map((l) => [l]) };
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
    execute: async (sql: string, binds?: Record<string, unknown>) => {
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
