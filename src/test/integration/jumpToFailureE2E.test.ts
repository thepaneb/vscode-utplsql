/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { installOutFormatIsolation } from './helpers';

// E2E do jump-to-failure: cria um package de teste DESCARTÁVEL no banco real,
// roda `executeRunOracle` nele e verifica o contrato publicado no TestRun —
// `failed(item, TestMessage)` com `location` apontando para o .pks da suite na
// linha do stack ("Go to Error"), mais o estado no `TestStateManager` e a
// contagem do `onComplete`.
//
// Autocontido: o package (spec + body) é criado aqui, a partir do fixture
// `fixtures/utplsql_jumpfail_e2e.pks`, e destruído no `after` (verificando
// `user_objects`). Nada depende de package pré-instalado nem do
// `compile_packages.sql`; a annotation cache do utPLSQL é purgada e
// reconstruída para o schema da conexão, senão o utPLSQL não acha a suite.
//
// Acoplamento de linhas (o ponto do teste): o `ut.expect` do BODY fica na linha
// EXPECT_LINE (5) e o `--%test` do .pks na linha TEST_DECL_LINE (5, 0-based 4),
// então a location 0-based cai exatamente na declaração `%test`.
//
// Gate: UTPLSQL_CONN no .env (mesma regra dos demais testes de integração).

const describeDB = process.env.UTPLSQL_CONN ? describe : describe.skip;

const EXT_ID = 'paneb.vscode-utplsql';
/** Nome do package no banco (o arquivo .pks é o mesmo nome em minúsculas). */
const PKG = 'UTPLSQL_JUMPFAIL_E2E';
const PKG_LOWER = 'utplsql_jumpfail_e2e';
const FIXTURE_NAME = `${PKG_LOWER}.pks`;
const SUITE_TITLE = 'Jump to failure E2E';
const TEST_DESC = 'Expects 1 to equal 2';
const PROC = 'expects_one_to_equal_two';
/** Linha (1-based) do `ut_expect` no package BODY — o stack aponta aqui. */
const EXPECT_LINE = 5;
/** Linha (1-based) do `--%test` no .pks — deve alinhar com EXPECT_LINE. */
const TEST_DECL_LINE = 5;

/**
 * Body do package. O `ut.expect` precisa cair na linha EXPECT_LINE: o
 * comentário na linha 4 existe só para empurrá-lo para lá (o Oracle numera as
 * linhas do DDL como enviado, e é esse número que o utPLSQL devolve no stack).
 */
function bodyDdl(utSchema: string): string {
  return `CREATE OR REPLACE PACKAGE BODY ${PKG} AS
  PROCEDURE ${PROC} IS
  BEGIN
    -- linha 5: o stack do utPLSQL aponta para cá
    ${utSchema}ut.expect(1).to_equal(2);
  END ${PROC};
END ${PKG};`;
}

interface FailedCall {
  item: vscode.TestItem;
  message: vscode.TestMessage;
}

interface Capture {
  failed: FailedCall[];
  passed: vscode.TestItem[];
  skipped: vscode.TestItem[];
  errored: FailedCall[];
  output: string[];
}

interface Counts {
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Espera a extensão aparecer e ficar ativa, com prazo. A ativação pode ser
 * lenta no host de teste (discovery inicial) e não pode derrubar o teste.
 */
async function activateExtension(timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let ext = vscode.extensions.getExtension(EXT_ID);
  while (!ext && Date.now() < deadline) {
    await delay(250);
    ext = vscode.extensions.getExtension(EXT_ID);
  }
  assert.ok(ext, `${EXT_ID} não encontrado no host de teste`);
  if (!ext.isActive) {
    await ext.activate();
  }
  while (!ext.isActive && Date.now() < deadline) {
    await delay(250);
  }
  assert.ok(ext.isActive, `${EXT_ID} não ficou ativa em ${timeoutMs}ms`);
}

/** `TestMessage.message` pode ser `string` ou `MarkdownString`; o runner usa string. */
function msgText(m: vscode.TestMessage): string {
  return typeof m.message === 'string' ? m.message : m.message.value;
}

/**
 * TestRun mínimo: `executeRunOracle` só usa appendOutput/passed/failed/
 * errored/skipped. Guardamos as chamadas para inspecionar a `TestMessage` (o
 * VSCode não devolve as mensagens de um TestRun real).
 */
function makeTestRun(cap: Capture, token: vscode.CancellationToken): vscode.TestRun {
  const first = (m: vscode.TestMessage | readonly vscode.TestMessage[]): vscode.TestMessage =>
    Array.isArray(m) ? (m[0] as vscode.TestMessage) : (m as vscode.TestMessage);
  return {
    id: 'jump-to-failure-e2e',
    name: 'jump to failure E2E',
    token,
    get isCancellationRequested() {
      return token.isCancellationRequested;
    },
    start: () => {},
    end: () => {},
    enqueued: () => {},
    started: () => {},
    passed: (item: vscode.TestItem) => {
      cap.passed.push(item);
    },
    failed: (
      item: vscode.TestItem,
      message: vscode.TestMessage | readonly vscode.TestMessage[],
    ) => {
      cap.failed.push({ item, message: first(message) });
    },
    errored: (
      item: vscode.TestItem,
      message: vscode.TestMessage | readonly vscode.TestMessage[],
    ) => {
      cap.errored.push({ item, message: first(message) });
    },
    skipped: (item: vscode.TestItem) => {
      cap.skipped.push(item);
    },
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

describeDB('jump to failure E2E — utPLSQL real -> failed() + TestMessage.location', () => {
  installOutFormatIsolation();

  let cap: Capture;
  let counts: Counts;
  let state: {
    cachedItems: vscode.TestItem[];
    getLastResults(): Map<string, { status: string; message?: string }>;
    getLastFailedItems(): vscode.TestItem[];
  };
  let item: vscode.TestItem;
  let fixturePath: string;
  let fixtureUri: vscode.Uri;
  /** Linha (0-based) do `--%test` no .pks (= TEST_DECL_LINE - 1). */
  let testDeclLine: number;
  let db: import('oracledb').Connection;
  let owner: string;
  let utSchema: string;

  function connParts(): { user: string; password: string; connectString: string } {
    const m = (process.env.UTPLSQL_CONN as string).match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
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

  async function withObjectFormat<T>(
    oracledb: typeof import('oracledb'),
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = oracledb.outFormat;
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    try {
      return await fn();
    } finally {
      oracledb.outFormat = previous;
    }
  }

  /** A suite só é descobrível pelo utPLSQL se estiver na annotation cache. */
  async function refreshAnnotationCache(conn: import('oracledb').Connection): Promise<void> {
    await conn.execute(
      `BEGIN ${utSchema}ut_runner.purge_cache(:owner, 'PACKAGE'); END;`,
      { owner },
      { autoCommit: true },
    );
    await conn.execute(
      `BEGIN ${utSchema}ut_runner.rebuild_annotation_cache(:owner, 'PACKAGE'); END;`,
      { owner },
      { autoCommit: true },
    );
  }

  async function dropPackage(conn: import('oracledb').Connection): Promise<void> {
    await conn
      .execute(
        `BEGIN EXECUTE IMMEDIATE 'DROP PACKAGE ${PKG}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
        {},
        {
          autoCommit: true,
        },
      )
      .catch(() => {});
  }

  /** Linhas do objeto que sobraram no schema (cleanup tem de zerar). */
  async function leftoverObjects(conn: import('oracledb').Connection): Promise<string[]> {
    const { rows } = await conn.execute(
      `SELECT object_type FROM user_objects WHERE object_name = :name ORDER BY object_type`,
      { name: PKG },
    );
    return (rows ?? []).map((r) =>
      Array.isArray(r) ? String(r[0] ?? '') : String((r as { OBJECT_TYPE: string }).OBJECT_TYPE),
    );
  }

  before(async function () {
    this.timeout(240_000);

    const { TestStateManager } = require('../../state.js');
    const {
      discoverUtplsqlSchema,
      executeRunOracle,
      closeOraclePool,
    } = require('../../oracleRunner.js');
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));

    const root = vscode.workspace.workspaceFolders?.[0];
    assert.ok(root, 'a suite precisa de um workspace folder aberto');

    fixturePath = path.join(
      root.uri.fsPath,
      'src',
      'test',
      'integration',
      'fixtures',
      FIXTURE_NAME,
    );
    assert.ok(fs.existsSync(fixturePath), `fixture ausente: ${fixturePath}`);
    fixtureUri = vscode.Uri.file(fixturePath);

    // O `--%test` precisa estar na linha TEST_DECL_LINE (1-based) do fixture.
    const fixtureLines = fs.readFileSync(fixturePath, 'utf8').split(/\r?\n/);
    const declIndex = fixtureLines.findIndex((l) => l.includes('--%test('));
    assert.strictEqual(
      declIndex + 1,
      TEST_DECL_LINE,
      `o %test do fixture deveria estar na linha ${TEST_DECL_LINE}, veio ${declIndex + 1}`,
    );
    testDeclLine = declIndex;
    const description = fixtureLines[declIndex].replace(/^\s*--%test\(/, '').replace(/\)\s*$/, '');
    assert.strictEqual(description, TEST_DESC, `descrição do %test no fixture: ${description}`);

    await activateExtension();

    owner = connParts().user.toUpperCase();
    db = await openRaw();
    utSchema = await withObjectFormat(oracledb, () => discoverUtplsqlSchema(db));
    await dropPackage(db);
    // Spec vem do próprio fixture; o body é criado aqui (ut_expect na linha 5).
    await db.execute(fs.readFileSync(fixturePath, 'utf8'), {}, { autoCommit: true });
    await db.execute(bodyDdl(utSchema), {}, { autoCommit: true });
    await refreshAnnotationCache(db);
    assert.deepStrictEqual(
      await leftoverObjects(db),
      ['PACKAGE', 'PACKAGE BODY'],
      'o package descartável deveria existir antes do run',
    );

    const controller = vscode.tests.createTestController(
      'utplsql-it-jumpfailure',
      'IT JumpToFailure',
    );
    const cts = new vscode.CancellationTokenSource();
    cap = { failed: [], passed: [], skipped: [], errored: [], output: [] };
    counts = { passed: 0, failed: 0, skipped: 0, errored: 0 };

    try {
      const st = new TestStateManager();
      state = st as never;

      // Arvore como o `testTree` monta: no de suite (kind 'suite', com o Uri do
      // .pks — e o que `resolveStackFrameToUri` procura em cachedItems) e o
      // testcase (kind 'test') como filho.
      const suiteItem = controller.createTestItem(`suite:${PKG_LOWER}`, SUITE_TITLE, fixtureUri);
      st.setMeta(suiteItem, {
        kind: 'suite',
        packageName: PKG_LOWER,
        uri: fixtureUri,
        folder: root,
      });
      st.cachedItems.push(suiteItem);
      st.setSuiteItem(`suite:${PKG_LOWER}`, suiteItem);
      st.setItem(suiteItem.id, suiteItem);

      item = controller.createTestItem(`test:${PKG_LOWER}.${PROC}`, description, fixtureUri);
      item.range = new vscode.Range(testDeclLine, 0, testDeclLine, 0);
      st.setMeta(item, {
        kind: 'test',
        packageName: PKG_LOWER,
        procName: PROC,
        description,
        uri: fixtureUri,
        folder: root,
      });
      suiteItem.children.add(item);
      st.setItem(item.id, item);
      controller.items.add(suiteItem);

      await executeRunOracle(
        {
          connection: process.env.UTPLSQL_CONN as string,
          pathArgs: [PKG_LOWER],
          coverage: false,
          sourcePath: 'install',
          root: root.uri.fsPath,
          run: makeTestRun(cap, cts.token),
          leafTests: [item],
          state: st,
          folders: vscode.workspace.workspaceFolders,
          onComplete: (p: number, f: number, s: number, e: number) => {
            counts = { passed: p, failed: f, skipped: s, errored: e };
          },
        },
        cts.token,
      );
    } finally {
      cts.dispose();
      controller.dispose();
      await closeOraclePool();
    }
  });

  after(async function () {
    this.timeout(120_000);
    if (!db) return;
    try {
      await dropPackage(db);
      await refreshAnnotationCache(db);
      const leftovers = await leftoverObjects(db);
      assert.deepStrictEqual(
        leftovers,
        [],
        `o package descartável ${PKG} não foi removido do schema ${owner}: ${leftovers.join(', ')}`,
      );
    } finally {
      await db.close().catch(() => {});
    }
  });

  it('o run real falha e registra o estado (onComplete, lastResults, lastFailedItems)', () => {
    const out = cap.output.join('');
    assert.strictEqual(
      cap.failed.length,
      1,
      `esperava 1 failed(), veio: ${cap.failed.length}\nsaida:\n${out}`,
    );
    assert.strictEqual(cap.failed[0].item.id, item.id);
    assert.strictEqual(cap.errored.length, 0);
    assert.ok(
      !cap.passed.some((p) => p.id === item.id),
      'o teste deveria ter falhado, não passado',
    );
    assert.ok(
      !cap.skipped.some((s) => s.id === item.id),
      'o teste tem resultado JUnit, não deveria ser marcado como skipped',
    );

    assert.ok(
      counts.failed >= 1,
      `onComplete deveria reportar failed >= 1, veio: ${JSON.stringify(counts)}`,
    );

    const result = state.getLastResults().get(item.id);
    assert.ok(result, 'lastResults deveria ter o testcase');
    assert.strictEqual(result.status, 'failed');

    assert.ok(
      state.getLastFailedItems().some((i) => i.id === item.id),
      'lastFailedItems deveria conter o testcase',
    );
  });

  it('a mensagem da falha carrega o indício do ut.expect e o stack real', () => {
    const { parseStackFrames } = require('../../junit.js');
    const text = msgText(cap.failed[0].message);

    assert.match(text, /ut_?\.?expect\(1\)\.to_equal\(2\)/, `mensagem: ${text}`);
    assert.match(text, /was expected to equal: 2/, `mensagem: ${text}`);

    // O frame real do utPLSQL: nome único qualificado (schema.package.procedure).
    const frames = parseStackFrames(text);
    assert.ok(frames && frames.length > 0, `mensagem sem frame: ${text}`);
    assert.strictEqual(
      frames[0].objectName,
      `${owner}.${PKG}.${PROC.toUpperCase()}`,
      `frame real: ${frames[0].objectName}`,
    );
    assert.strictEqual(frames[0].line, EXPECT_LINE, 'o ut.expect deveria estar na linha 5');
  });

  it('location aponta para o .pks da suite na linha do stack (Go to Error)', () => {
    const loc = cap.failed[0].message.location;
    assert.ok(loc, 'a falha deveria publicar TestMessage.location (Go to Error)');

    assert.strictEqual(loc.uri.fsPath, fixturePath);
    assert.ok(loc.uri.fsPath.endsWith(FIXTURE_NAME), `uri: ${loc.uri.fsPath}`);

    // Valor absoluto (EXPECT_LINE - 1 = 4) e alinhado com o `--%test` do .pks.
    assert.strictEqual(loc.range.start.line, EXPECT_LINE - 1);
    assert.strictEqual(loc.range.start.line, testDeclLine);
    assert.ok(loc.range.start.line >= 0, 'range.start.line deveria ser >= 0');
    assert.ok(
      loc.range.start.line < fs.readFileSync(fixturePath, 'utf8').split(/\r?\n/).length,
      'a linha deveria estar dentro do .pks',
    );
  });
});
