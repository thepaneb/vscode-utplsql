import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { closeOraclePool } from '../../oracleRunner';
import {
  applySqlCoverage,
  discoverViewFiles,
  matchExecutedViews,
  viewNameFromPath,
} from '../../viewCoverage';

test('viewNameFromPath: extrai nome do objeto em maiusculas', () => {
  assert.strictEqual(viewNameFromPath('/ws/install/views/vw_vendedor.sql'), 'VW_VENDEDOR');
});

test('matchExecutedViews: view executada quando SQL_TEXT contem o nome', () => {
  const files = [
    { uri: { fsPath: '/ws/install/views/vw_vendedor.sql' } },
    { uri: { fsPath: '/ws/install/views/vw_total.sql' } },
  ];
  const executed = matchExecutedViews(
    ['SELECT * FROM vw_vendedor WHERE 1=1', 'SELECT 1 FROM dual'],
    files as never,
  );
  assert.deepStrictEqual(executed, [true, false]);
});

test('matchExecutedViews: case-insensitive e word boundary', () => {
  const files = [{ uri: { fsPath: '/ws/install/views/vw_sales.sql' } }];
  assert.deepStrictEqual(matchExecutedViews(['select * from VW_SALES x'], files as never), [true]);
  // não casa prefixo (v_w_sales vs vw_sales2)
  assert.deepStrictEqual(matchExecutedViews(['vw_sales2'], files as never), [false]);
});

test('matchExecutedViews: V$SQL vazio → nada executado', () => {
  const files = [{ uri: { fsPath: '/ws/install/views/vw_x.sql' } }];
  assert.deepStrictEqual(matchExecutedViews([], files as never), [false]);
});

test('matchExecutedViews: nome com regex special e escapado', () => {
  const files = [{ uri: { fsPath: '/ws/install/views/vw_(tmp).sql' } }];
  const executed = matchExecutedViews(['select * from vw_(tmp)'], files as never);
  assert.deepStrictEqual(executed, [true]);
});

test('discoverViewFiles: encontra .sql sob views/ recursivamente', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'views-'));
  try {
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(path.join(viewsDir, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'vw_a.sql'), 'CREATE VIEW vw_a AS ...');
    fs.writeFileSync(path.join(viewsDir, 'sub', 'vw_b.sql'), 'CREATE VIEW vw_b AS ...');
    fs.writeFileSync(path.join(viewsDir, 'not-a-view.txt'), 'x');
    const files = discoverViewFiles(base, 'install').sort();
    assert.deepStrictEqual(files.map((f) => path.basename(f)).sort(), ['vw_a.sql', 'vw_b.sql']);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('discoverViewFiles: sem pasta views retorna vazio', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'views-'));
  try {
    assert.deepStrictEqual(discoverViewFiles(base, 'install'), []);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

// ── applySqlCoverage (V$SQL) ─────────────────────────────────────────

function makeRun() {
  const output: string[] = [];
  const coverageList: unknown[] = [];
  return {
    output,
    coverageList,
    appendOutput: (s: string) => output.push(s),
    addCoverage: (fc: unknown) => coverageList.push(fc),
  };
}

test('applySqlCoverage: V$SQL negado emite aviso com grant (não quebra)', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-'));
  try {
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'vw_total_por_vendedor.sql'), 'CREATE VIEW ...');

    const conn = {
      callTimeout: 0,
      execute: async () => {
        throw new Error('ORA-00942: table or view "SYS"."V_$SQL" does not exist');
      },
      close: async () => {},
    };
    const fakeOracledb = {
      OUT_FORMAT_OBJECT: {},
      createPool: async () => ({
        getConnection: async () => conn,
        close: async () => {},
      }),
      getConnection: async () => conn,
    };

    const run = makeRun() as never;
    const state = { setCoverage: () => {}, clearCoverage: () => {} } as never;
    const folders = [{ uri: { fsPath: base }, name: 'r', index: 0 }];

    try {
      await applySqlCoverage(
        {
          connection: 'UT3/pass@//localhost:1521/freepdb1',
          root: base,
          sourcePath: 'install',
          run,
          state,
          folders: folders as never,
        },
        async () => fakeOracledb as never,
      );
    } finally {
      await closeOraclePool();
    }

    const out = (run as unknown as { output: string[] }).output.join('\n');
    assert.ok(out.includes('V$SQL'), 'deveria avisar sobre o V$SQL');
    assert.ok(out.includes('GRANT SELECT ON SYS.V_$SQL'), 'deveria citar o grant');
    assert.strictEqual((run as unknown as { coverageList: unknown[] }).coverageList.length, 0);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('applySqlCoverage: com V$SQL ok emite cobertura por linha', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-'));
  try {
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(
      path.join(viewsDir, 'vw_total_por_vendedor.sql'),
      'CREATE VIEW vw_total_por_vendedor AS\nSELECT 1 FROM dual\n',
    );

    const conn = {
      callTimeout: 0,
      execute: async () => ({
        rows: [['SELECT * FROM vw_total_por_vendedor WHERE 1=1']],
      }),
      close: async () => {},
    };
    const fakeOracledb = {
      OUT_FORMAT_OBJECT: {},
      createPool: async () => ({
        getConnection: async () => conn,
        close: async () => {},
      }),
      getConnection: async () => conn,
    };

    const run = makeRun() as never;
    const state = { setCoverage: () => {}, clearCoverage: () => {} } as never;
    const folders = [{ uri: { fsPath: base }, name: 'r', index: 0 }];

    try {
      await applySqlCoverage(
        {
          connection: 'UT3/pass@//localhost:1521/freepdb1',
          root: base,
          sourcePath: 'install',
          run,
          state,
          folders: folders as never,
        },
        async () => fakeOracledb as never,
      );
    } finally {
      await closeOraclePool();
    }

    assert.strictEqual((run as unknown as { coverageList: unknown[] }).coverageList.length, 1);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('applySqlCoverage: multi-root filtra views fora da raiz analisada', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-'));
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-other-'));
  try {
    // raiz analisada: base/install/views
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'vw_a.sql'), 'CREATE VIEW vw_a AS\nSELECT 1\n');
    // outra pasta multi-root: other/install/views (fora da raiz)
    const otherViews = path.join(other, 'install', 'views');
    fs.mkdirSync(otherViews, { recursive: true });
    fs.writeFileSync(path.join(otherViews, 'vw_b.sql'), 'CREATE VIEW vw_b AS\nSELECT 1\n');

    const conn = {
      callTimeout: 0,
      execute: async () => ({
        rows: [['SELECT * FROM vw_a'], ['SELECT * FROM vw_b']],
      }),
      close: async () => {},
    };
    const fakeOracledb = {
      OUT_FORMAT_OBJECT: {},
      createPool: async () => ({
        getConnection: async () => conn,
        close: async () => {},
      }),
      getConnection: async () => conn,
    };

    const run = makeRun() as never;
    const state = { setCoverage: () => {}, clearCoverage: () => {} } as never;
    const folders = [
      { uri: { fsPath: base }, name: 'base', index: 0 },
      { uri: { fsPath: other }, name: 'other', index: 1 },
    ];

    try {
      await applySqlCoverage(
        {
          connection: 'UT3/pass@//localhost:1521/freepdb1',
          root: base,
          sourcePath: 'install',
          run,
          state,
          folders: folders as never,
        },
        async () => fakeOracledb as never,
      );
    } finally {
      await closeOraclePool();
    }

    // só a view da raiz analisada (vw_a) deve ser emitida — vw_b fica de fora
    assert.strictEqual((run as unknown as { coverageList: unknown[] }).coverageList.length, 1);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
    fs.rmSync(other, { recursive: true, force: true });
  }
});

test('applySqlCoverage: loader padrão (oracledb real) com conexão inválida não lança', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-def-'));
  try {
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'vw_a.sql'), 'CREATE VIEW vw_a AS\nSELECT 1\n');
    const run = makeRun() as never;
    const state = { setCoverage: () => {}, clearCoverage: () => {} } as never;
    const folders = [{ uri: { fsPath: base }, name: 'r', index: 0 }];
    // Sem o 3º parâmetro -> usa o loadOracledb real (import) e falha no parseConnString antes de conectar
    await applySqlCoverage({
      connection: 'formato-invalido',
      root: base,
      sourcePath: 'install',
      run,
      state,
      folders: folders as never,
    });
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('applySqlCoverage: loader retorna undefined -> retorna cedo', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-undef-'));
  try {
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'vw_a.sql'), 'CREATE VIEW vw_a AS\nSELECT 1\n');
    const run = makeRun() as never;
    const state = { setCoverage: () => {}, clearCoverage: () => {} } as never;
    const folders = [{ uri: { fsPath: base }, name: 'r', index: 0 }];
    await applySqlCoverage(
      {
        connection: 'u/p@//h:1521/s',
        root: base,
        sourcePath: 'install',
        run,
        state,
        folders: folders as never,
      },
      async () => undefined,
    );
    assert.strictEqual((run as unknown as { coverageList: unknown[] }).coverageList.length, 0);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('applySqlCoverage: V$SQL com rows em objeto (SQL_TEXT)', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-obj-'));
  try {
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'vw_a.sql'), 'CREATE VIEW vw_a AS\nSELECT 1\n');
    const conn = {
      callTimeout: 0,
      execute: async () => ({ rows: [{ SQL_TEXT: 'SELECT * FROM vw_a' }] }),
      close: async () => {},
    };
    const fakeOracledb = {
      OUT_FORMAT_OBJECT: {},
      createPool: async () => ({ getConnection: async () => conn, close: async () => {} }),
      getConnection: async () => conn,
    };
    const run = makeRun() as never;
    const state = { setCoverage: () => {}, clearCoverage: () => {} } as never;
    const folders = [{ uri: { fsPath: base }, name: 'r', index: 0 }];
    try {
      await applySqlCoverage(
        {
          connection: 'u/p@//h:1521/s',
          root: base,
          sourcePath: 'install',
          run,
          state,
          folders: folders as never,
        },
        async () => fakeOracledb as never,
      );
    } finally {
      await closeOraclePool();
    }
    assert.strictEqual((run as unknown as { coverageList: unknown[] }).coverageList.length, 1);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('applySqlCoverage: sem folders usa fallback (viewFiles vazio)', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-nof-'));
  try {
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'vw_a.sql'), 'CREATE VIEW vw_a AS\nSELECT 1\n');
    const conn = {
      callTimeout: 0,
      execute: async () => ({ rows: [['SELECT * FROM vw_a']] }),
      close: async () => {},
    };
    const fakeOracledb = {
      OUT_FORMAT_OBJECT: {},
      createPool: async () => ({ getConnection: async () => conn, close: async () => {} }),
      getConnection: async () => conn,
    };
    const run = makeRun() as never;
    const state = { setCoverage: () => {}, clearCoverage: () => {} } as never;
    try {
      await applySqlCoverage(
        {
          connection: 'u/p@//h:1521/s',
          root: base,
          sourcePath: 'install',
          run,
          state,
          folders: undefined,
        },
        async () => fakeOracledb as never,
      );
    } finally {
      await closeOraclePool();
    }
    assert.strictEqual((run as unknown as { coverageList: unknown[] }).coverageList.length, 1);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('applySqlCoverage: createPool falha cai para getConnection raw', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-raw-'));
  try {
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'vw_a.sql'), 'CREATE VIEW vw_a AS\nSELECT 1\n');
    const conn = {
      callTimeout: 0,
      execute: async () => ({ rows: [['SELECT * FROM vw_a']] }),
      close: async () => {},
    };
    const fakeOracledb = {
      OUT_FORMAT_OBJECT: {},
      createPool: async () => {
        throw new Error('pool negado');
      },
      getConnection: async () => conn,
    };
    const run = makeRun() as never;
    const state = { setCoverage: () => {}, clearCoverage: () => {} } as never;
    const folders = [{ uri: { fsPath: base }, name: 'r', index: 0 }];
    try {
      await applySqlCoverage(
        {
          connection: 'u/p@//h:1521/s',
          root: base,
          sourcePath: 'install',
          run,
          state,
          folders: folders as never,
        },
        async () => fakeOracledb as never,
      );
    } finally {
      await closeOraclePool();
    }
    assert.strictEqual((run as unknown as { coverageList: unknown[] }).coverageList.length, 1);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('applySqlCoverage: view não executada ganha hits 0', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-hits0-'));
  try {
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'vw_a.sql'), 'CREATE VIEW vw_a AS\nSELECT 1\n');
    fs.writeFileSync(path.join(viewsDir, 'vw_b.sql'), 'CREATE VIEW vw_b AS\nSELECT 2\n');
    const conn = {
      callTimeout: 0,
      execute: async () => ({ rows: [['SELECT * FROM vw_b']] }),
      close: async () => {},
    };
    const fakeOracledb = {
      OUT_FORMAT_OBJECT: {},
      createPool: async () => ({ getConnection: async () => conn, close: async () => {} }),
      getConnection: async () => conn,
    };
    const run = makeRun() as never;
    const state = { setCoverage: () => {}, clearCoverage: () => {} } as never;
    const folders = [{ uri: { fsPath: base }, name: 'r', index: 0 }];
    try {
      await applySqlCoverage(
        {
          connection: 'u/p@//h:1521/s',
          root: base,
          sourcePath: 'install',
          run,
          state,
          folders: folders as never,
        },
        async () => fakeOracledb as never,
      );
    } finally {
      await closeOraclePool();
    }
    const cov = (run as unknown as { coverageList: unknown[] }).coverageList;
    assert.strictEqual(cov.length, 2);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
