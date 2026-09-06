import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import type { UtConfig } from '../../config';
import type { TestCaseResult } from '../../junit';
import {
  acquireRunnerConnections,
  closeOraclePool,
  discoverUtplsqlSchema,
  ensurePool,
  executeRunOracle,
  findInvalidUt3Objects,
  mapDbPathsToFiles,
  parseConnString,
} from '../../oracleRunner';
import { applyResultsFromCases, countResults } from '../../results';
import type { ItemMeta } from '../../types';

function makeMeta(over: Partial<ItemMeta>): ItemMeta {
  return {
    kind: 'test',
    packageName: 'app',
    procName: 'proc',
    description: 'desc',
    uri: { fsPath: '/x', path: '/x', scheme: 'file' } as any,
    ...over,
  } as ItemMeta;
}

function makeRun() {
  const passed: any[] = [];
  const failed: any[] = [];
  const skipped: any[] = [];
  const errored: any[] = [];
  const output: string[] = [];
  return {
    passed: (t: any, ms?: number) => passed.push({ t, ms }),
    failed: (t: any, m: any, ms?: number) => failed.push({ t, m, ms }),
    skipped: (t: any) => skipped.push(t),
    errored: (t: any, m: any, ms?: number) => errored.push({ t, m, ms }),
    appendOutput: (s: string) => output.push(s),
    enqueued: () => {},
    started: () => {},
    addCoverage: () => {},
    end: () => {},
    passedList: passed,
    failedList: failed,
    skippedList: skipped,
    erroredList: errored,
    output,
  };
}

function makeState(metaMap: Map<any, ItemMeta>) {
  return {
    getMeta: (t: any) => metaMap.get(t),
    setMeta: () => {},
    setCoverage: () => {},
    getCoverage: () => [],
    clearCoverage: () => {},
    cachedItems: [] as any[],
  } as any;
}

// ── parseConnString ──────────────────────────────────────────────────

test('parseConnString: string valida', () => {
  const r = parseConnString('UT3/senha@//localhost:1521/freepdb1');
  assert.strictEqual(r.user, 'UT3');
  assert.strictEqual(r.password, 'senha');
  assert.strictEqual(r.connectionString, 'localhost:1521/freepdb1');
});

test('parseConnString: host com ip e porta customizada', () => {
  const r = parseConnString('user/pass@//192.168.1.100:9999/XE');
  assert.strictEqual(r.user, 'user');
  assert.strictEqual(r.password, 'pass');
  assert.strictEqual(r.connectionString, '192.168.1.100:9999/XE');
});

test('parseConnString: servico com underscore e caracteres validos', () => {
  const r = parseConnString('ADMIN/pass_123@//db.example.com:1521/pdb_svc1');
  assert.strictEqual(r.user, 'ADMIN');
  assert.strictEqual(r.password, 'pass_123');
  assert.strictEqual(r.connectionString, 'db.example.com:1521/pdb_svc1');
});

test('parseConnString: formato invalido lanca erro', () => {
  assert.throws(() => parseConnString('invalid'));
  assert.throws(() => parseConnString('user/pass@host'));
  assert.throws(() => parseConnString('user/pass@host:port'));
  assert.throws(() => parseConnString(''));
});

test('parseConnString: hostname com subdominios', () => {
  const r = parseConnString('u/p@//ora-prod.us-east1.company.com:1521/proddb');
  assert.strictEqual(r.user, 'u');
  assert.strictEqual(r.password, 'p');
  assert.strictEqual(r.connectionString, 'ora-prod.us-east1.company.com:1521/proddb');
});

// ── applyResultsFromCases ────────────────────────────────────────────

test('applyResultsFromCases: mapeia passed por packageName|procName', () => {
  const cases: TestCaseResult[] = [
    { classname: 'pkg', name: 't_one', status: 'passed', durationMs: 100 },
  ];
  const item = { id: 't1', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 't_one' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.size, 1);
  assert.strictEqual(resultMap.get('t1')?.status, 'passed');
});

test('applyResultsFromCases: mapeia failed com message', () => {
  const cases: TestCaseResult[] = [
    {
      classname: 'pkg',
      name: 'f_test',
      status: 'failed',
      message: 'expected 1 got 2',
      durationMs: 50,
    },
  ];
  const item = { id: 't2', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 'f_test' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.get('t2')?.status, 'failed');
  assert.strictEqual(resultMap.get('t2')?.message, 'expected 1 got 2');
});

test('applyResultsFromCases: mapeia skipped', () => {
  const cases: TestCaseResult[] = [{ classname: 'pkg', name: 's_me', status: 'skipped' }];
  const item = { id: 't3', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 's_me' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.get('t3')?.status, 'skipped');
});

test('applyResultsFromCases: mapeia errored', () => {
  const cases: TestCaseResult[] = [
    { classname: 'pkg', name: 'boom', status: 'error', message: 'ORA-00001' },
  ];
  const item = { id: 't4', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 'boom' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.get('t4')?.status, 'error');
  assert.strictEqual(resultMap.get('t4')?.message, 'ORA-00001');
});

test('applyResultsFromCases: fallback por description quando procName nao bate', () => {
  const cases: TestCaseResult[] = [{ classname: 'shm.pkg', name: 'Cenario um', status: 'passed' }];
  const item = { id: 't5', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(
    item,
    makeMeta({ packageName: 'pkg', procName: 'diff_proc', description: 'Cenario um' }),
  );

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.size, 1);
  assert.strictEqual(resultMap.get('t5')?.status, 'passed');
});

test('applyResultsFromCases: fallback por procName sem package', () => {
  const cases: TestCaseResult[] = [
    { classname: 'some_schema.different', name: 'match_by_proc', status: 'passed' },
  ];
  const item = { id: 't6', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'different', procName: 'match_by_proc' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.get('t6')?.status, 'passed');
});

test('applyResultsFromCases: unmatched items sao skipped', () => {
  const cases: TestCaseResult[] = [];
  const item = { id: 't7', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 'no_match' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.size, 0);
});

test('applyResultsFromCases: multiplos cases com match misto', () => {
  const cases: TestCaseResult[] = [
    { classname: 'pkg', name: 't_a', status: 'passed', durationMs: 10 },
    { classname: 'pkg', name: 't_b', status: 'failed', message: 'err', durationMs: 20 },
    { classname: 'pkg', name: 'diff_proc', status: 'skipped' },
  ];
  const itemA = { id: 'a', children: [] };
  const itemB = { id: 'b', children: [] };
  const itemC = { id: 'c', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(itemA, makeMeta({ packageName: 'pkg', procName: 't_a' }));
  metaMap.set(itemB, makeMeta({ packageName: 'pkg', procName: 't_b' }));
  metaMap.set(itemC, makeMeta({ packageName: 'pkg', procName: 'diff_proc' }));
  // itemC uses JUnit name 'diff_proc' which matches procName

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [itemA, itemB, itemC] as any, run, state);
  assert.strictEqual(resultMap.size, 3);
  assert.strictEqual(resultMap.get('a')?.status, 'passed');
  assert.strictEqual(resultMap.get('b')?.status, 'failed');
  assert.strictEqual(resultMap.get('b')?.message, 'err');
  assert.strictEqual(resultMap.get('c')?.status, 'skipped');
});

// ── countResultsFromCases ────────────────────────────────────────────

test('countResults: conta todos os statuses', () => {
  const cases: TestCaseResult[] = [
    { classname: 'p', name: 'a', status: 'passed', durationMs: 100 },
    { classname: 'p', name: 'b', status: 'failed', durationMs: 50 },
    { classname: 'p', name: 'c', status: 'skipped', durationMs: 0 },
    { classname: 'p', name: 'd', status: 'error', durationMs: 25 },
    { classname: 'p', name: 'e', status: 'passed', durationMs: 10 },
  ];
  const r = countResults(cases);
  assert.strictEqual(r.passed, 2);
  assert.strictEqual(r.failed, 1);
  assert.strictEqual(r.skipped, 1);
  assert.strictEqual(r.errored, 1);
  assert.strictEqual(r.totalMs, 185);
});

test('countResults: durationMs undefined nao quebra', () => {
  const cases: TestCaseResult[] = [
    { classname: 'p', name: 'a', status: 'passed' },
    { classname: 'p', name: 'b', status: 'failed' },
  ];
  const r = countResults(cases);
  assert.strictEqual(r.totalMs, 0);
});

test('countResults: array vazio retorna zeros', () => {
  const r = countResults([]);
  assert.strictEqual(r.passed, 0);
  assert.strictEqual(r.failed, 0);
  assert.strictEqual(r.skipped, 0);
  assert.strictEqual(r.errored, 0);
  assert.strictEqual(r.totalMs, 0);
});

// ── pool (ensurePool / closeOraclePool / acquireRunnerConnections) ──

const POOL_CFG = {
  oraclePoolMin: 3,
  oraclePoolMax: 7,
  oraclePoolIncrement: 2,
  oraclePoolPingInterval: 30,
} as unknown as UtConfig;

function makeFakeOracledb(opts?: { createPoolThrows?: boolean }) {
  const created: Record<string, unknown>[] = [];
  const rawConns: unknown[] = [];
  const pools: {
    attrs: Record<string, unknown>;
    closed: boolean;
    getConnection(): Promise<unknown>;
    close(): Promise<void>;
  }[] = [];
  const mod = {
    OUT_FORMAT_OBJECT: { id: 'object' },
    outFormat: undefined as unknown,
    createPool: async (attrs: Record<string, unknown>) => {
      created.push(attrs);
      if (opts?.createPoolThrows) throw new Error('db down');
      const pool = {
        attrs,
        closed: false,
        getConnection: async () => {
          if (pool.closed) throw new Error('pool fechado');
          return { fromPool: true, callTimeout: 1234 };
        },
        close: async () => {
          pool.closed = true;
        },
      };
      pools.push(pool);
      return pool;
    },
    getConnection: async (attrs?: unknown) => {
      rawConns.push(attrs);
      return { fromPool: false };
    },
  };
  return { mod, created, rawConns, pools };
}

test('ensurePool: cria pool com credenciais parseadas e settings', async () => {
  const { mod, created } = makeFakeOracledb();
  try {
    await ensurePool(mod as never, 'ut3/senha@//localhost:1521/freepdb1', POOL_CFG);
    assert.strictEqual(created.length, 1);
    assert.strictEqual(created[0].user, 'ut3');
    assert.strictEqual(created[0].password, 'senha');
    assert.strictEqual(created[0].connectString, 'localhost:1521/freepdb1');
    assert.strictEqual(created[0].poolMin, 3);
    assert.strictEqual(created[0].poolMax, 7);
    assert.strictEqual(created[0].poolIncrement, 2);
    assert.strictEqual(created[0].poolPingInterval, 30);
    assert.strictEqual(created[0].stmtCacheSize, 30);
  } finally {
    await closeOraclePool();
  }
});

test('ensurePool: reutiliza pool quando connection string e igual', async () => {
  const { mod, created } = makeFakeOracledb();
  try {
    const conn = 'u/p@//h:1521/s';
    await ensurePool(mod as never, conn, POOL_CFG);
    await ensurePool(mod as never, conn, POOL_CFG);
    assert.strictEqual(created.length, 1);
  } finally {
    await closeOraclePool();
  }
});

test('ensurePool: fecha pool antigo e cria novo quando connection muda', async () => {
  const { mod, created, pools } = makeFakeOracledb();
  try {
    await ensurePool(mod as never, 'u1/p@//h1:1521/s1', POOL_CFG);
    await ensurePool(mod as never, 'u2/p@//h2:1521/s2', POOL_CFG);
    assert.strictEqual(created.length, 2);
    assert.strictEqual(pools[0].closed, true);
    assert.strictEqual(created[1].user, 'u2');
  } finally {
    await closeOraclePool();
  }
});

test('closeOraclePool: fecha pool e reseta estado', async () => {
  const { mod, created, pools } = makeFakeOracledb();
  const conn = 'u/p@//h:1521/s';
  try {
    await ensurePool(mod as never, conn, POOL_CFG);
    await closeOraclePool();
    assert.strictEqual(pools[0].closed, true);
    await ensurePool(mod as never, conn, POOL_CFG);
    assert.strictEqual(created.length, 2);
  } finally {
    await closeOraclePool();
  }
});

test('acquireRunnerConnections: usa pool quando disponivel', async () => {
  const { mod, rawConns } = makeFakeOracledb();
  try {
    const { conn1, conn2 } = await acquireRunnerConnections(
      mod as never,
      'u/p@//h:1521/s',
      POOL_CFG,
    );
    assert.strictEqual((conn1 as unknown as Record<string, unknown>).fromPool, true);
    assert.strictEqual((conn2 as unknown as Record<string, unknown>).fromPool, true);
    assert.strictEqual(rawConns.length, 0);
    assert.strictEqual(mod.outFormat, mod.OUT_FORMAT_OBJECT);
  } finally {
    await closeOraclePool();
  }
});

test('acquireRunnerConnections: fallback para conexao raw quando createPool falha', async () => {
  const { mod, rawConns } = makeFakeOracledb({ createPoolThrows: true });
  try {
    const { conn1, conn2 } = await acquireRunnerConnections(
      mod as never,
      'u/p@//h:1521/s',
      POOL_CFG,
    );
    assert.strictEqual((conn1 as unknown as Record<string, unknown>).fromPool, false);
    assert.strictEqual((conn2 as unknown as Record<string, unknown>).fromPool, false);
    assert.strictEqual(rawConns.length, 2);
    const parsed = rawConns[0] as Record<string, unknown>;
    assert.strictEqual(parsed.user, 'u');
    assert.strictEqual(parsed.connectionString, 'h:1521/s');
    assert.strictEqual(mod.outFormat, mod.OUT_FORMAT_OBJECT);
  } finally {
    await closeOraclePool();
  }
});

test('acquireRunnerConnections: zera callTimeout vazado de conexoes do pool', async () => {
  const { mod } = makeFakeOracledb();
  try {
    const { conn1, conn2 } = await acquireRunnerConnections(
      mod as never,
      'u/p@//h:1521/s',
      POOL_CFG,
    );
    assert.strictEqual((conn1 as unknown as Record<string, unknown>).callTimeout, 0);
    assert.strictEqual((conn2 as unknown as Record<string, unknown>).callTimeout, 0);
  } finally {
    await closeOraclePool();
  }
});

// ── findInvalidUt3Objects (callTimeout não deve vazar para o pool) ───

function makeFindInvalidMod(conn: {
  execute: (sql: string) => Promise<{ rows: unknown[] }>;
  callTimeout: number;
  close: () => Promise<void>;
}) {
  const mod = {
    OUT_FORMAT_OBJECT: { id: 'object' },
    createPool: async () => ({
      getConnection: async () => conn,
      close: async () => {},
    }),
    getConnection: async () => {
      throw new Error('raw indisponivel');
    },
  };
  return mod;
}

test('findInvalidUt3Objects: restaura callTimeout original ao devolver conexao', async () => {
  const seenTimeouts: number[] = [];
  let closed = false;
  const conn = {
    callTimeout: 777,
    execute: async (sql: string) => {
      seenTimeouts.push(conn.callTimeout);
      if (/ALL_SYNONYMS/i.test(sql)) return { rows: [{ TABLE_OWNER: 'UT3' }] };
      return { rows: [] };
    },
    close: async () => {
      closed = true;
    },
  };
  try {
    const result = await findInvalidUt3Objects(
      makeFindInvalidMod(conn) as never,
      'u/p@//h:1521/s',
      POOL_CFG,
    );
    assert.deepStrictEqual(result, { schema: 'UT3', invalid: [] });
    assert.strictEqual(closed, true);
    assert.strictEqual(conn.callTimeout, 777);
    assert.ok(seenTimeouts.length > 0);
    assert.ok(seenTimeouts.every((t) => t === 5000));
  } finally {
    await closeOraclePool();
  }
});

test('findInvalidUt3Objects: restaura callTimeout tambem em caso de erro', async () => {
  const conn = {
    callTimeout: 777,
    execute: async () => {
      throw new Error('ORA-00942');
    },
    close: async () => {},
  };
  try {
    const result = await findInvalidUt3Objects(
      makeFindInvalidMod(conn) as never,
      'u/p@//h:1521/s',
      POOL_CFG,
    );
    assert.strictEqual(result, undefined);
    assert.strictEqual(conn.callTimeout, 777);
  } finally {
    await closeOraclePool();
  }
});

// ── discoverUtplsqlSchema ────────────────────────────────────────────

test('discoverUtplsqlSchema: retorna prefixo do owner', async () => {
  const conn = {
    execute: async () => ({ rows: [{ TABLE_OWNER: 'UT3' }] }),
  };
  const prefix = await discoverUtplsqlSchema(conn as never);
  assert.strictEqual(prefix, 'UT3.');
});

test('discoverUtplsqlSchema: sem synonym retorna vazio', async () => {
  const conn = {
    execute: async () => ({ rows: [] }),
  };
  const prefix = await discoverUtplsqlSchema(conn as never);
  assert.strictEqual(prefix, '');
});

test('discoverUtplsqlSchema: erro de acesso retorna vazio', async () => {
  const conn = {
    execute: async () => {
      throw new Error('ORA-00942');
    },
  };
  const prefix = await discoverUtplsqlSchema(conn as never);
  assert.strictEqual(prefix, '');
});

// ── mapDbPathsToFiles ────────────────────────────────────────────────

test('mapDbPathsToFiles: mapeia tipo para pasta', () => {
  const xml = `<coverage><filename="package body APP.CALC" /><filename="function APP.FN1" /><filename="procedure APP.PR1" /><filename="trigger APP.TR1" /><filename="view APP.VW1" /></coverage>`;
  const mapped = mapDbPathsToFiles(xml);
  assert.ok(mapped.includes('filename="packages/CALC.sql"'));
  assert.ok(mapped.includes('filename="functions/FN1.sql"'));
  assert.ok(mapped.includes('filename="procedures/PR1.sql"'));
  assert.ok(mapped.includes('filename="triggers/TR1.sql"'));
  assert.ok(mapped.includes('filename="views/VW1.sql"'));
});

test('mapDbPathsToFiles: xml sem filename permanece inalterado', () => {
  const xml = '<coverage><nothing/></coverage>';
  assert.strictEqual(mapDbPathsToFiles(xml), xml);
});

// ── executeRunOracle (fluxo streaming/poll) ──────────────────────────

const JUNIT_XML =
  '<testsuites tests="1" failures="0"><testsuite name="pkg" tests="1">' +
  '<testcase classname="pkg" name="t1" time="0.05"/></testsuite></testsuites>';
const COV_XML =
  '<coverage><packages><package name="pkg"><classes><class name="app" ' +
  'filename="packages/app.sql"><lines><line number="1" hits="1"/>' +
  '</lines></class></classes></package></packages></coverage>';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeOracleRunFake(opts: { runMs?: number; buffer: string[]; runThrows?: boolean }) {
  const conn1 = {
    callTimeout: 0,
    execute: async (sql: string) => {
      if (/ALL_SYNONYMS/.test(sql)) return { rows: [{ TABLE_OWNER: 'UT3' }] };
      if (/DELETE FROM/.test(sql)) return {};
      if (/ut_runner\.run/.test(sql)) {
        if (opts.runThrows) throw new Error('ORA-04068: existing state');
        await sleep(opts.runMs ?? 350);
        return {};
      }
      return {};
    },
    close: async () => {},
    break: async () => {},
  };
  let polls = 0;
  const conn2 = {
    callTimeout: 0,
    execute: async (sql: string) => {
      if (/UT_OUTPUT_BUFFER_TMP/.test(sql) && /SELECT/.test(sql)) {
        polls++;
        if (polls === 1) return { rows: [{ MESSAGE_ID: 1, TEXT: 'Doc output' }] };
        return {
          rows: opts.buffer.map((text, i) => ({ MESSAGE_ID: 2 + i, TEXT: text })),
        };
      }
      return {};
    },
    close: async () => {},
    break: async () => {},
  };
  const mod = {
    OUT_FORMAT_OBJECT: { id: 'object' },
    createPool: async () => {
      let i = 0;
      return {
        getConnection: async () => (i++ === 0 ? conn1 : conn2),
        close: async () => {},
      };
    },
    getConnection: async () => {
      throw new Error('raw indisponivel');
    },
  };
  return { mod, conn1, conn2 };
}

function makeOracleRunState(metaMap: Map<any, ItemMeta>) {
  return {
    getMeta: (t: any) => metaMap.get(t),
    setMeta: () => {},
    setCoverage: () => {},
    getCoverage: () => [],
    clearCoverage: () => {},
    cachedItems: [] as any[],
    setLastResults: () => {},
    setLastFailedItems: () => {},
    getLastFailedItems: () => [] as any[],
  } as any;
}

function makeLeaf() {
  const item = { id: 't1', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 't1' }));
  return { item, metaMap };
}

const neverCancel = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
};

test('executeRunOracle: fluxo feliz aplica resultados e info no output', async () => {
  const { mod } = makeOracleRunFake({ buffer: [JUNIT_XML] });
  const run = makeRun() as any;
  const { item, metaMap } = makeLeaf();
  let complete: number[] | undefined;
  try {
    await executeRunOracle(
      {
        connection: 'u/p@//h:1521/s',
        pathArgs: ['pkg'],
        coverage: false,
        sourcePath: 'install',
        root: '/root',
        run,
        leafTests: [item as any],
        state: makeOracleRunState(metaMap),
        onComplete: (p, f, s, e, ms) => {
          complete = [p, f, s, e, ms];
        },
      },
      neverCancel as never,
      async () => mod as never,
    );
  } finally {
    await closeOraclePool();
  }

  assert.strictEqual(run.passedList.length, 1);
  assert.strictEqual(complete?.[0], 1);
  const out = run.output.join('\n');
  assert.match(out, /Oracle runner/);
  assert.ok(out.includes('Doc output'), 'deveria streamar o reporter de documentação');
});

test('executeRunOracle: cobertura sem <coverage> avisa o GRANT DBMS_PROFILER', async () => {
  const { mod } = makeOracleRunFake({ buffer: [JUNIT_XML] });
  const run = makeRun() as any;
  const { item, metaMap } = makeLeaf();
  try {
    await executeRunOracle(
      {
        connection: 'u/p@//h:1521/s',
        pathArgs: ['pkg'],
        coverage: true,
        sourcePath: 'install',
        root: '/root',
        run,
        leafTests: [item as any],
        state: makeOracleRunState(metaMap),
      },
      neverCancel as never,
      async () => mod as never,
    );
  } finally {
    await closeOraclePool();
  }
  const out = run.output.join('\n');
  assert.match(out, /relatório não gerado/);
  assert.match(out, /GRANT EXECUTE ON SYS\.DBMS_PROFILER/);
});

test('executeRunOracle: cobertura sem arquivos mapeados emite aviso', async () => {
  const { mod } = makeOracleRunFake({ buffer: [JUNIT_XML, COV_XML] });
  const run = makeRun() as any;
  const { item, metaMap } = makeLeaf();
  try {
    await executeRunOracle(
      {
        connection: 'u/p@//h:1521/s',
        pathArgs: ['pkg'],
        coverage: true,
        sourcePath: 'install',
        root: '/root',
        run,
        leafTests: [item as any],
        state: makeOracleRunState(metaMap),
        folders: [],
      },
      neverCancel as never,
      async () => mod as never,
    );
  } finally {
    await closeOraclePool();
  }
  const out = run.output.join('\n');
  assert.match(out, /nenhum arquivo mapeado/);
});

test('executeRunOracle: erro do ut_runner.run propaga (fallback CLI no runner.ts)', async () => {
  const { mod } = makeOracleRunFake({ buffer: [], runThrows: true });
  const run = makeRun() as any;
  const { item, metaMap } = makeLeaf();
  let err: Error | undefined;
  try {
    await executeRunOracle(
      {
        connection: 'u/p@//h:1521/s',
        pathArgs: ['pkg'],
        coverage: false,
        sourcePath: 'install',
        root: '/root',
        run,
        leafTests: [item as any],
        state: makeOracleRunState(metaMap),
      },
      neverCancel as never,
      async () => mod as never,
    ).catch((e: Error) => {
      err = e;
    });
  } finally {
    await closeOraclePool();
  }
  assert.ok(err, 'deveria propagar o erro');
  assert.match(String(err?.message), /ORA-04068/);
});

test('executeRunOracle: sem oracledb lanca erro orientando a instalar', async () => {
  const run = makeRun() as any;
  const { item, metaMap } = makeLeaf();
  let err: Error | undefined;
  await executeRunOracle(
    {
      connection: 'u/p@//h:1521/s',
      pathArgs: ['pkg'],
      coverage: false,
      sourcePath: 'install',
      root: '/root',
      run,
      leafTests: [item as any],
      state: makeOracleRunState(metaMap),
    },
    neverCancel as never,
    async () => undefined,
  ).catch((e: Error) => {
    err = e;
  });
  assert.ok(err);
  assert.match(String(err?.message), /oracledb/);
});

test('executeRunOracle: loader padrão com conexão inválida rejeita (loadOracledb real)', async () => {
  const run = makeRun() as any;
  const { item, metaMap } = makeLeaf();
  await assert.rejects(() =>
    executeRunOracle(
      {
        connection: 'formato-invalido',
        pathArgs: ['pkg'],
        coverage: false,
        sourcePath: 'install',
        root: '/root',
        run,
        leafTests: [item as any],
        state: makeOracleRunState(metaMap),
      },
      neverCancel as never,
    ),
  );
});

test('findInvalidUt3Objects: rows em formato objeto (OUT_FORMAT_OBJECT)', async () => {
  const conn = {
    callTimeout: 0,
    execute: async (sql: string) => {
      if (/ALL_SYNONYMS/i.test(sql)) return { rows: [{ TABLE_OWNER: 'UT3' }] };
      return { rows: [{ OBJECT_NAME: 'UT_RUNNER', OBJECT_TYPE: 'PACKAGE' }] };
    },
    close: async () => {},
  };
  const mod = {
    OUT_FORMAT_OBJECT: {},
    createPool: async () => ({ getConnection: async () => conn, close: async () => {} }),
    getConnection: async () => conn,
  };
  try {
    const r = await findInvalidUt3Objects(mod as never, 'u/p@//h:1521/s', POOL_CFG);
    assert.strictEqual(r?.invalid[0].name, 'UT_RUNNER');
  } finally {
    await closeOraclePool();
  }
});

test('executeRunOracle: pathArgs vazio gera ut_varchar2_list() vazia', async () => {
  const { mod } = makeOracleRunFake({ buffer: [JUNIT_XML] });
  const run = makeRun() as any;
  const { item, metaMap } = makeLeaf();
  try {
    await executeRunOracle(
      {
        connection: 'u/p@//h:1521/s',
        pathArgs: [],
        coverage: false,
        sourcePath: 'install',
        root: '/root',
        run,
        leafTests: [item as any],
        state: makeOracleRunState(metaMap),
      },
      neverCancel as never,
      async () => mod as never,
    );
  } finally {
    await closeOraclePool();
  }
});

test('executeRunOracle: rows com TEXT null são ignorados no poll', async () => {
  let polled = 0;
  const conn1 = {
    callTimeout: 0,
    execute: async (sql: string) => {
      if (/ALL_SYNONYMS/.test(sql)) return { rows: [{ TABLE_OWNER: 'UT3' }] };
      if (/DELETE FROM/.test(sql)) return {};
      if (/ut_runner\.run/.test(sql)) {
        await new Promise((r) => setTimeout(r, 300));
        return {};
      }
      return {};
    },
    close: async () => {},
    break: async () => {},
  };
  const conn2 = {
    callTimeout: 0,
    execute: async () => {
      polled++;
      if (polled === 1) return { rows: [{ MESSAGE_ID: 1, TEXT: null }] };
      return { rows: [{ MESSAGE_ID: 2, TEXT: JUNIT_XML }] };
    },
    close: async () => {},
    break: async () => {},
  };
  const mod = {
    OUT_FORMAT_OBJECT: {},
    createPool: async () => {
      let i = 0;
      return { getConnection: async () => (i++ === 0 ? conn1 : conn2), close: async () => {} };
    },
    getConnection: async () => conn1,
  };
  const run = makeRun() as any;
  const { item, metaMap } = makeLeaf();
  try {
    await executeRunOracle(
      {
        connection: 'u/p@//h:1521/s',
        pathArgs: ['pkg'],
        coverage: false,
        sourcePath: 'install',
        root: '/root',
        run,
        leafTests: [item as any],
        state: makeOracleRunState(metaMap),
      },
      neverCancel as never,
      async () => mod as never,
    );
  } finally {
    await closeOraclePool();
  }
  assert.strictEqual(run.passedList.length, 1);
});

test('findInvalidUt3Objects: objeto sem OBJECT_NAME usa vazio', async () => {
  const conn = {
    callTimeout: 0,
    execute: async (sql: string) => {
      if (/ALL_SYNONYMS/i.test(sql)) return { rows: [{ TABLE_OWNER: 'UT3' }] };
      return { rows: [{}] };
    },
    close: async () => {},
  };
  const mod = {
    OUT_FORMAT_OBJECT: {},
    createPool: async () => ({ getConnection: async () => conn, close: async () => {} }),
    getConnection: async () => conn,
  };
  try {
    const r = await findInvalidUt3Objects(mod as never, 'u/p@//h:1521/s', POOL_CFG);
    assert.strictEqual(r?.invalid[0].name, '');
  } finally {
    await closeOraclePool();
  }
});

test('executeRunOracle: poll com erro em conn2 é ignorado', async () => {
  let polled = 0;
  const conn1 = {
    callTimeout: 0,
    execute: async (sql: string) => {
      if (/ALL_SYNONYMS/.test(sql)) return { rows: [{ TABLE_OWNER: 'UT3' }] };
      if (/DELETE FROM/.test(sql)) return {};
      if (/ut_runner\.run/.test(sql)) {
        await new Promise((r) => setTimeout(r, 300));
        return {};
      }
      return {};
    },
    close: async () => {},
    break: async () => {},
  };
  const conn2 = {
    callTimeout: 0,
    execute: async () => {
      polled++;
      if (polled === 1) throw new Error('poll temporario');
      return { rows: [{ MESSAGE_ID: 1, TEXT: JUNIT_XML }] };
    },
    close: async () => {},
    break: async () => {},
  };
  const mod = {
    OUT_FORMAT_OBJECT: {},
    createPool: async () => {
      let i = 0;
      return { getConnection: async () => (i++ === 0 ? conn1 : conn2), close: async () => {} };
    },
    getConnection: async () => conn1,
  };
  const run = makeRun() as any;
  const { item, metaMap } = makeLeaf();
  try {
    await executeRunOracle(
      {
        connection: 'u/p@//h:1521/s',
        pathArgs: ['pkg'],
        coverage: false,
        sourcePath: 'install',
        root: '/root',
        run,
        leafTests: [item as any],
        state: makeOracleRunState(metaMap),
      },
      neverCancel as never,
      async () => mod as never,
    );
  } finally {
    await closeOraclePool();
  }
  assert.strictEqual(run.passedList.length, 1);
});
