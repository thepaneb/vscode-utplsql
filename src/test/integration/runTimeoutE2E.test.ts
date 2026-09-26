/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { installOutFormatIsolation } from './helpers';

// E2E do timeout de execução (`utplsql.timeoutMinutes`) contra o banco real.
//
// Um package descartável (`UTPLSQL_TIMEOUT_SCHEMAIT`) tem um teste que fica em
// busy-wait por 8s. Executado com `timeoutMinutes: 0.02` (1,2s), o
// `executeRunOracle` precisa abortar o run sozinho — `conn.break()` nas duas
// conexões, sem ninguém chamar `cts.cancel()` — e devolver muito antes dos 8s.
// Logo depois, um segundo run REAL de um package que passa
// (`UTPLSQL_AFTER_TIMEOUT_SCHEMAIT`) prova que a sessão quebrada não
// envenenou o pool: o run termina com `passed >= 1`.
//
// O que o unit test de `oracleRunner` (timeout com conns fake) não alcança:
// o `break()` real numa sessão com transação aberta e o estado do pool depois
// dele — é o que diferencia "cancelou" de "abandonou a conexão".
//
// Gate: UTPLSQL_CONN no .env (mesma regra dos demais testes de integração).
// Os dois packages são dropados no `finally`, junto com o pool.

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

const SLOW_PKG = 'UTPLSQL_TIMEOUT_SCHEMAIT';
const SLOW_PROC = 'busy_wait_8s';
const SLOW_DESC = 'busy waits 8 seconds';
const PASS_PKG = 'UTPLSQL_AFTER_TIMEOUT_SCHEMAIT';
const PASS_PROC = 'passing_with_marker';
const PASS_DESC = 'passes and prints a marker';
const MARKER = 'utplsql-runtimeout-marker-it';

/** 0,02 min = 1,2s: o timeout vence com folga do busy-wait de 8s do teste. */
const TIMEOUT_MINUTES = 0.02;
/** Teto de duração do 1º run — bem abaixo dos 8s que o teste levaria. */
const MAX_RUN_MS = 5000;

function connParts(): { user: string; password: string; connectString: string } {
  const conn = process.env.UTPLSQL_CONN as string;
  const m = conn.match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
  assert.ok(m, 'UTPLSQL_CONN deve ser user/pass@//host:port/svc');
  return { user: m[1], password: m[2], connectString: m[3] };
}

async function openRaw(): Promise<import('oracledb').Connection> {
  const mod = await import('oracledb');
  const oracledb =
    ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
    (mod as typeof import('oracledb'));
  const { user, password, connectString } = connParts();
  return oracledb.getConnection({ user, password, connectString });
}

async function dropPackage(dbc: import('oracledb').Connection, name: string): Promise<void> {
  try {
    await dbc.execute(
      `BEGIN EXECUTE IMMEDIATE 'DROP PACKAGE ${name}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
      {},
      { autoCommit: true },
    );
  } catch {
    /* ignore */
  }
}

/**
 * Cria os dois packages descartáveis e invalida o cache de anotações do
 * utPLSQL (sem isso `ut_runner.run` não enxerga objetos criados fora do setup).
 * O busy-wait usa `DBMS_UTILITY.GET_TIME` (centésimos de segundo), que é
 * público — `DBMS_LOCK.SLEEP` exigiria grant.
 *
 * `utSchema` vem de `discoverUtplsqlSchema`: nada de `ut3` hardcoded, que
 * quebra em install compartilhado de outro schema e em install próprio (onde o
 * prefixo é `''` e `ut_runner` resolve pelo objeto local do usuário).
 */
async function createPackages(dbc: import('oracledb').Connection, utSchema: string): Promise<void> {
  await dropPackage(dbc, SLOW_PKG);
  await dropPackage(dbc, PASS_PKG);

  await dbc.execute(
    `CREATE OR REPLACE PACKAGE ${SLOW_PKG} AS
       --%suite(Timeout E2E)

       --%test(${SLOW_DESC})
       PROCEDURE ${SLOW_PROC};
     END ${SLOW_PKG};`,
    {},
    { autoCommit: true },
  );
  await dbc.execute(
    `CREATE OR REPLACE PACKAGE BODY ${SLOW_PKG} AS
       PROCEDURE ${SLOW_PROC} IS
         l_t0   PLS_INTEGER;
         l_spin BINARY_DOUBLE := 0;
       BEGIN
         l_t0 := DBMS_UTILITY.GET_TIME;
         LOOP
           l_spin := l_spin + 1;
           EXIT WHEN DBMS_UTILITY.GET_TIME - l_t0 >= 800; -- 8s
         END LOOP;
       END ${SLOW_PROC};
     END ${SLOW_PKG};`,
    {},
    { autoCommit: true },
  );

  await dbc.execute(
    `CREATE OR REPLACE PACKAGE ${PASS_PKG} AS
       --%suite(Depois do timeout E2E)

       --%test(${PASS_DESC})
       PROCEDURE ${PASS_PROC};
     END ${PASS_PKG};`,
    {},
    { autoCommit: true },
  );
  await dbc.execute(
    `CREATE OR REPLACE PACKAGE BODY ${PASS_PKG} AS
       PROCEDURE ${PASS_PROC} IS
       BEGIN
         DBMS_OUTPUT.PUT_LINE('${MARKER}');
       END ${PASS_PROC};
     END ${PASS_PKG};`,
    {},
    { autoCommit: true },
  );

  const owner = connParts().user.toUpperCase();
  // `purge_cache` limpa o cache de suites antes da reanotação. Sem isso, um
  // package recém-criado pode ficar fora da janela de refresh do utPLSQL e
  // produzir ORA-20204 ("Suite package ... does not exist").
  await dbc.execute(
    `BEGIN ${utSchema}ut_runner.purge_cache(:owner, 'PACKAGE'); END;`,
    { owner },
    { autoCommit: true },
  );
  await dbc.execute(
    `BEGIN ${utSchema}ut_runner.rebuild_annotation_cache(:owner, 'PACKAGE'); END;`,
    { owner },
    { autoCommit: true },
  );
}

/**
 * Roda `fn` com `oracledb.outFormat` em OUT_FORMAT_OBJECT e restaura o global
 * (`oracledb.outFormat` é global e mutado por outros testes).
 */
async function withObjectFormat<T>(
  oracledb: typeof import('oracledb'),
  fn: () => Promise<T>,
): Promise<T> {
  const prev = oracledb.outFormat;
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  try {
    return await fn();
  } finally {
    oracledb.outFormat = prev;
  }
}

/**
 * Objetos do schema de conexão que sobraram depois do cleanup. Precisa zerar:
 * resto de um run anterior (ou de um `DROP` que falhou) faria o próximo run
 * reencontrar a suite no cache de anotações.
 */
async function leftoverObjects(dbc: import('oracledb').Connection): Promise<string[]> {
  try {
    const r = await dbc.execute(
      `SELECT object_name || ' (' || object_type || ')' AS leftover
         FROM user_objects
        WHERE object_name IN (:a, :b)
        ORDER BY object_name, object_type`,
      { a: SLOW_PKG, b: PASS_PKG },
    );
    return (r.rows ?? []).map((row) => {
      const v = (row as { LEFTOVER?: unknown }).LEFTOVER ?? (row as unknown[])[0];
      return String(v ?? '');
    });
  } catch (e) {
    return [`<consulta a user_objects falhou: ${String(e)}>`];
  }
}

interface Capture {
  passed: string[];
  output: string[];
}

interface Counts {
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
}

/** TestRun mínimo: o runner só usa appendOutput/passed/failed/errored/skipped. */
function makeTestRun(cap: Capture, name: string, token: vscode.CancellationToken): vscode.TestRun {
  return {
    id: name,
    name,
    token,
    get isCancellationRequested() {
      return token.isCancellationRequested;
    },
    start: () => {},
    end: () => {},
    enqueued: () => {},
    started: () => {},
    passed: (item: vscode.TestItem) => {
      cap.passed.push(item.id);
    },
    failed: () => {},
    errored: () => {},
    skipped: () => {},
    appendOutput: (text: string) => {
      cap.output.push(text);
    },
    addCoverage: () => {},
    addError: () => {},
    addMessage: () => {},
    addWorkspaceFolder: () => {},
    removeWorkspaceFolder: () => {},
  } as unknown as vscode.TestRun;
}

describeDB('run timeout E2E — break expira o teste e o pool sobrevive', () => {
  installOutFormatIsolation();

  let slowRunMs = 0;
  let afterMs = 0;
  let cancelRequested = false;
  let inUseAfterTimeout = -1;
  let poolOpenAfterTimeout = false;
  let slowCap: Capture;
  let afterCap: Capture;
  let afterCounts: Counts;
  let poolInUseDuringFirstRun = 0;
  let flowFailed = false;
  const softNotes: string[] = [];

  before(async function () {
    this.timeout(180_000);

    const { TestStateManager } = require('../../state.js');
    const {
      executeRunOracle,
      closeOraclePool,
      ensurePool,
      discoverUtplsqlSchema,
    } = require('../../oracleRunner.js');
    const { readConfig } = require('../../config.js');
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));

    const conn = process.env.UTPLSQL_CONN as string;
    const root = vscode.workspace.workspaceFolders?.[0];
    assert.ok(root, 'a suite precisa de um workspace folder aberto');

    const dbc = await openRaw();
    const controller = vscode.tests.createTestController('utplsql-it-runtimeout', 'IT RunTimeout');
    // Token nunca é cancelado: o timeout tem de vir só do `timeoutMinutes`.
    const cts = new vscode.CancellationTokenSource();

    try {
      // `discoverUtplsqlSchema` lê o synonym público do UT_RUNNER: 'UT3.' em
      // install compartilhado, '' em install próprio (o `ut_runner` resolve
      // pelo objeto local). A leitura de `TABLE_OWNER` é feita por nome de
      // coluna, então precisa de OUT_FORMAT_OBJECT — o default do driver, mas
      // fixado aqui porque `outFormat` é global e outro teste pode ter mudado.
      const utSchema = await withObjectFormat<string>(oracledb, () => discoverUtplsqlSchema(dbc));
      await createPackages(dbc, utSchema);

      // Pool criado ANTES do run: `ensurePool` reaproveita a mesma instância
      // que o `executeRunOracle` vai usar (mesma chave de config), então o que
      // medirmos aqui é o pool do run.
      const pool = await ensurePool(oracledb, conn, readConfig());

      const state = new TestStateManager();
      // Os packages nascem no schema do usuário da conexão (o mesmo dono que
      // o utPLSQL usa como owner) — o Uri do item é só para o
      // `resolveStackFrameToUri` do jump-to-failure.
      const testSchema = connParts().user.toUpperCase();
      const slowUri = vscode.Uri.joinPath(root.uri, 'db', testSchema, `${SLOW_PKG}.pks`);
      const afterUri = vscode.Uri.joinPath(root.uri, 'db', testSchema, `${PASS_PKG}.pks`);

      // Árvore mínima: nó de suite (kind 'suite') + testcase (kind 'test'),
      // como o `testTree` monta — é o que o `applyResultsFromCases` casa.
      const slowSuite = controller.createTestItem(`suite:${SLOW_PKG}`, 'Timeout E2E', slowUri);
      state.setMeta(slowSuite, {
        kind: 'suite',
        packageName: SLOW_PKG,
        uri: slowUri,
        folder: root,
      });
      const slowItem = controller.createTestItem(
        `test:${SLOW_PKG}.${SLOW_PROC}`,
        SLOW_DESC,
        slowUri,
      );
      state.setMeta(slowItem, {
        kind: 'test',
        packageName: SLOW_PKG,
        procName: SLOW_PROC,
        description: SLOW_DESC,
        uri: slowUri,
        folder: root,
      });
      slowSuite.children.add(slowItem);
      controller.items.add(slowSuite);
      state.cachedItems.push(slowSuite);
      state.setSuiteItem(slowSuite.id, slowSuite);
      state.setItem(slowItem.id, slowItem);

      const afterSuite = controller.createTestItem(
        `suite:${PASS_PKG}`,
        'Depois do timeout',
        afterUri,
      );
      state.setMeta(afterSuite, {
        kind: 'suite',
        packageName: PASS_PKG,
        uri: afterUri,
        folder: root,
      });
      const afterItem = controller.createTestItem(
        `test:${PASS_PKG}.${PASS_PROC}`,
        PASS_DESC,
        afterUri,
      );
      state.setMeta(afterItem, {
        kind: 'test',
        packageName: PASS_PKG,
        procName: PASS_PROC,
        description: PASS_DESC,
        uri: afterUri,
        folder: root,
      });
      afterSuite.children.add(afterItem);
      controller.items.add(afterSuite);
      state.cachedItems.push(afterSuite);
      state.setSuiteItem(afterSuite.id, afterSuite);
      state.setItem(afterItem.id, afterItem);

      // ── 1º run: o teste lento, com timeout de 1,2s ──────────────────────
      slowCap = { passed: [], output: [] };
      const t0 = Date.now();
      const slowRun = executeRunOracle(
        {
          connection: conn,
          pathArgs: [SLOW_PKG],
          coverage: false,
          sourcePath: 'install',
          root: root.uri.fsPath,
          run: makeTestRun(slowCap, 'run-timeout-slow', cts.token),
          leafTests: [slowItem],
          state,
          folders: vscode.workspace.workspaceFolders,
          timeoutMinutes: TIMEOUT_MINUTES,
        },
        cts.token,
      );
      // Amostra o pool com o run em andamento: o `break` só significa alguma
      // coisa se as duas conexões do runner estiverem checked out.
      await new Promise((r) => setTimeout(r, 600));
      poolInUseDuringFirstRun = pool.connectionsInUse;
      await slowRun;
      slowRunMs = Date.now() - t0;
      cancelRequested = cts.token.isCancellationRequested;
      inUseAfterTimeout = pool.connectionsInUse;
      poolOpenAfterTimeout = pool.status === oracledb.POOL_STATUS_OPEN;

      // ── 2º run: package que passa, no MESMO pool, sem timeout ─────────────
      afterCap = { passed: [], output: [] };
      afterCounts = { passed: 0, failed: 0, skipped: 0, errored: 0 };
      const t1 = Date.now();
      await executeRunOracle(
        {
          connection: conn,
          pathArgs: [PASS_PKG],
          coverage: false,
          sourcePath: 'install',
          root: root.uri.fsPath,
          run: makeTestRun(afterCap, 'run-timeout-after', cts.token),
          leafTests: [afterItem],
          state,
          folders: vscode.workspace.workspaceFolders,
          dbmsOutput: true,
          onComplete: (p: number, f: number, s: number, e: number) => {
            afterCounts = { passed: p, failed: f, skipped: s, errored: e };
          },
        },
        cts.token,
      );
      afterMs = Date.now() - t1;

      // O DBMS_OUTPUT é bônus: prova que a sessão do 2º run (a mesma que saiu
      // do `break`) ainda drena output. Ausência não reprova o E2E.
      if (!afterCap.output.join('').includes(MARKER)) {
        softNotes.push(`DBMS_OUTPUT não trouxe o marker (best-effort, ${afterMs}ms)`);
      }
    } catch (e) {
      flowFailed = true;
      throw e;
    } finally {
      cts.dispose();
      controller.dispose();
      await dropPackage(dbc, SLOW_PKG);
      await dropPackage(dbc, PASS_PKG);
      // O cleanup não é best effort: `DROP` engolido em silêncio deixa o
      // package para trás e o próximo run acha a suite no cache. Confere
      // USER_OBJECTS e falha — sem, porém, mascarar uma falha anterior do
      // corpo do teste (nesse caso só loga).
      const leftovers = await leftoverObjects(dbc);
      if (leftovers.length > 0) {
        const msg = `cleanup: sobraram objetos de teste no banco: ${leftovers.join(', ')}`;
        if (flowFailed) console.log(`[runTimeoutE2E] ${msg}`);
        else assert.fail(msg);
      }
      await dbc.close().catch(() => {});
      await closeOraclePool();
    }
  });

  it('o run lento aborta no timeout, sem cts.cancel(), muito antes dos 8s', () => {
    const out = slowCap.output.join('');
    assert.strictEqual(
      cancelRequested,
      false,
      'o token não deveria ter sido cancelado — o timeout tem de vir do break',
    );
    assert.ok(
      slowRunMs < MAX_RUN_MS,
      `o run deveria abortar em ~1,2s, levou ${slowRunMs}ms (teto ${MAX_RUN_MS}ms)\nsaida:\n${out}`,
    );
    // Prova de que o teste lento chegou a rodar: sem isso, um package inválido
    // (erro de compilação) também "terminaria em menos de 5s".
    assert.match(
      out,
      new RegExp(SLOW_PKG, 'i'),
      `a saída deveria citar o package em execução:\n${out}`,
    );
    assert.strictEqual(
      slowCap.passed.length,
      0,
      `o teste não pode ter passado antes do timeout: ${slowCap.passed.join(', ')}`,
    );
  });

  it('com o run em andamento, as 2 conexões do runner vêm do pool amostrado', () => {
    // Sem isto, o "em uso = 0" abaixo seriatrivial: também daria 0 se o run
    // tivesse caído no fallback de `oracledb.getConnection` (conexões raw) e
    // o pool amostrado nunca tivesse sido usado.
    assert.ok(
      poolInUseDuringFirstRun >= 2,
      `o run deveria estar com conn1+conn2 checked out no pool amostrado, veio ${poolInUseDuringFirstRun}`,
    );
  });

  it('o pool não fica com conexão em uso depois do break', () => {
    assert.strictEqual(
      inUseAfterTimeout,
      0,
      `o run deveria devolver as 2 conexões (conn1/conn2) ao pool; em uso: ${inUseAfterTimeout} (durante o run: ${poolInUseDuringFirstRun})`,
    );
    assert.strictEqual(
      poolOpenAfterTimeout,
      true,
      'o pool deveria continuar aberto após o timeout (break ≠ close)',
    );
  });

  it('um run real seguinte, no mesmo pool, termina com passed >= 1', () => {
    const out = afterCap.output.join('');
    assert.ok(
      afterCounts.passed >= 1,
      `o 2º run deveria passar; onComplete=${JSON.stringify(afterCounts)} (${afterMs}ms)\nsaida:\n${out}`,
    );
    assert.ok(
      afterCap.passed.includes(`test:${PASS_PKG}.${PASS_PROC}`),
      `o TestRun deveria receber passed() do testcase; recebeu: ${afterCap.passed.join(', ')}\nsaida:\n${out}`,
    );
    assert.strictEqual(afterCounts.failed, 0, `o 2º run não deveria falhar\nsaida:\n${out}`);
    if (softNotes.length > 0) {
      console.log(`[runTimeoutE2E] best-effort: ${softNotes.join('; ')}`);
    }
  });
});
