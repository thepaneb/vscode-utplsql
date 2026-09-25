/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { firstCol, installOutFormatIsolation } from './helpers';

// E2E de dois caminhos que só existem contra o banco real, no `executeRunOracle`:
//
//   A) **tags** — `a_tags => 'it_fast & !it_slow'` tem de chegar ao
//      `ut_runner.run` e fazer o utPLSQL ignorar o teste `it_slow`. O package
//      descartável tem DOIS testes que passam; se o filtro não fosse aplicado
//      (bind não tipado, expressão mal formada, `a_tags` fora do SQL), os dois
//      rodariam e `onComplete` traria passed=2. A árvore de TestItem é passada
//      VAZIA (`leafTests: []`) de propósito: o que se prova aqui é a contagem do
//      JUnit, não o mapeamento resultado→item.
//
//   B) **streaming/CDATA** — `UT_OUTPUT_BUFFER_TMP.TEXT` é `VARCHAR2(4000)`, e
//      uma linha de `DBMS_OUTPUT` de 10.000 chars não cabe num chunk só. O
//      reporter JUnit a emite dentro de `<system-out><![CDATA[ ... ]]>`; o
//      `executeRunOracle` monta o XML linha a linha e precisa manter a
//      "CDATA aberta" entre chunks — se a flag `inCdata` se perdesse, as linhas
//      de conteúdo iriam para `appendOutput` e o `parseJUnit` receberia um
//      JUnit truncado/corrompido. As asserções leem o buffer REAL depois do run
//      (sem limpar antes) e verificam os fatos: existe chunk >= 3.900 chars, a
//      concatenação dos TEXT por `message_id` fecha um bloco CDATA com >= 9.000
//      'U', e o parse do XML não foi corrompido.
//
// O que os unit tests de `oracleRunner` (conns fake) não alcançam: o bind
// `UT_VARCHAR2_LIST`/STRING chegando ao PL/SQL, o `ORA-20204` quando o cache de
// suites ignora o package recém-criado, o round-trip real do VARCHAR2(4000) e
// o `fast-xml-parser` sobre um CDATA partido em vários chunks.
//
// Gate: UTPLSQL_CONN no .env (mesma regra dos demais testes de integração).
// Os dois packages e as linhas do buffer são dropados no `after`, que ainda
// verifica em `user_objects` que nada sobrou, junto com o pool do runner.

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

const TAGS_PKG = 'UTPLSQL_TAGSE2E_IT';
const FAST_PROC = 'fast_ok';
const FAST_DESC = 'it_fast roda';
const SLOW_PROC = 'slow_ok';
const SLOW_DESC = 'it_slow roda';

const STREAM_PKG = 'UTPLSQL_STREAME2E_IT';
const BIG_PROC = 'prints_10k';
const BIG_DESC = 'linha de 10k U';

/** Expressão de tags passada ao `executeRunOracle` (A). */
const TAGS_EXPR = 'it_fast & !it_slow';

/**
 * Menor `LENGTH(TEXT)` que prova que a linha de 10.000 chars foi mesmo
 * quebrada em chunks de ~4.000 (e não espremida num único VARCHAR2).
 */
const MIN_CHUNK_LEN = 3900;

/**
 * Quantos 'U' precisam sobreviver à concatenação dos chunks. A linha tem
 * 10.000; o CDATA abre com `<![CDATA[` e fecha com `]]>`, então 9.000 dá folga
 * para o chunk de abertura e o de fechamento.
 */
const MIN_U_RUN = 9000;

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

/** Maior sequência contígua de um caractere num texto. */
function maxRunOf(text: string, char: string): number {
  return Math.max(0, ...(text.match(new RegExp(`${char}+`, 'g')) ?? ['']).map((s) => s.length));
}

interface Capture {
  passed: string[];
  failed: string[];
  errored: string[];
  skipped: string[];
  output: string[];
}

interface Counts {
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
  durationMs: number;
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
    failed: (item: vscode.TestItem) => {
      cap.failed.push(item.id);
    },
    errored: (item: vscode.TestItem) => {
      cap.errored.push(item.id);
    },
    skipped: (item: vscode.TestItem) => {
      cap.skipped.push(item.id);
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

describeDB('tags + streaming/CDATA E2E — filtro de tags e buffer VARCHAR2(4000)', () => {
  installOutFormatIsolation();

  let dbc: import('oracledb').Connection;
  let cts: vscode.CancellationTokenSource;
  let controller: vscode.TestController;
  /** Prefixo do schema do utPLSQL (`UT3.` em install compartilhado, '' local). */
  let utSchema = '';
  /** `utSchema` + o nome da tabela do buffer, já montado. */
  let bufferTable = '';

  const conn = (): string => process.env.UTPLSQL_CONN as string;

  before(async function () {
    this.timeout(180_000);

    const { discoverUtplsqlSchema } = require('../../oracleRunner.js');
    const root = vscode.workspace.workspaceFolders?.[0];
    assert.ok(root, 'a suite precisa de um workspace folder aberto');

    dbc = await openRaw();
    // O `oracledb.outFormat` global NÃO é tocado aqui: o `installOutFormatIsolation`
    // só restaura o valor dentro dos `it`s, e o `before` ficaria fora dessa
    // proteção. `discoverUtplsqlSchema` lê `TABLE_OWNER` como coluna de objeto,
    // então recebe rows normalizadas para esse shape.
    const objectRowsConn = {
      execute: async (
        sql: string,
        binds?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => {
        const r = await dbc.execute(sql, (binds ?? {}) as never, options as never);
        return {
          rows: (r.rows ?? []).map((row) =>
            Array.isArray(row) ? { TABLE_OWNER: String(row[0] ?? '') } : row,
          ),
        };
      },
    };
    utSchema = await discoverUtplsqlSchema(objectRowsConn);
    bufferTable = `${utSchema}UT_OUTPUT_BUFFER_TMP`;
    const bufferInfo = `${utSchema}UT_OUTPUT_BUFFER_INFO_TMP`;

    const owner = connParts().user.toUpperCase();
    cts = new vscode.CancellationTokenSource();
    controller = vscode.tests.createTestController('utplsql-it-tags-stream', 'IT TagsStream');

    await dropPackage(dbc, TAGS_PKG);
    await dropPackage(dbc, STREAM_PKG);

    // A) dois testes que passam, um `it_fast` e outro `it_slow`, bodies NULL.
    await dbc.execute(
      `CREATE OR REPLACE PACKAGE ${TAGS_PKG} AS
         --%suite(Tags E2E)

         --%test(${FAST_DESC})
         --%tags(it_fast)
         PROCEDURE ${FAST_PROC};

         --%test(${SLOW_DESC})
         --%tags(it_slow)
         PROCEDURE ${SLOW_PROC};
       END ${TAGS_PKG};`,
      {},
      { autoCommit: true },
    );
    await dbc.execute(
      `CREATE OR REPLACE PACKAGE BODY ${TAGS_PKG} AS
         PROCEDURE ${FAST_PROC} IS
         BEGIN
           NULL;
         END ${FAST_PROC};
         PROCEDURE ${SLOW_PROC} IS
         BEGIN
           NULL;
         END ${SLOW_PROC};
       END ${TAGS_PKG};`,
      {},
      { autoCommit: true },
    );

    // B) um teste que joga 10.000 chars numa única linha de DBMS_OUTPUT.
    await dbc.execute(
      `CREATE OR REPLACE PACKAGE ${STREAM_PKG} AS
         --%suite(Stream E2E)

         --%test(${BIG_DESC})
         PROCEDURE ${BIG_PROC};
       END ${STREAM_PKG};`,
      {},
      { autoCommit: true },
    );
    await dbc.execute(
      `CREATE OR REPLACE PACKAGE BODY ${STREAM_PKG} AS
         PROCEDURE ${BIG_PROC} IS
         BEGIN
           DBMS_OUTPUT.PUT_LINE(RPAD('U',10000,'U'));
         END ${BIG_PROC};
       END ${STREAM_PKG};`,
      {},
      { autoCommit: true },
    );

    // `purge_cache` + `rebuild_annotation_cache`: o primeiro limpa o cache de
    // SUITES, o segundo reanota. Sem o purge, um package criado antes do
    // `parse_time` mais recente do schema fica fora da janela de refresh do
    // utPLSQL (que só reparseia `last_ddl_time >= parse_time`) e o run estoura
    // ORA-20204 ("Suite package ... does not exist").
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

    await dbc.execute(`DELETE FROM ${bufferTable}`, {}, { autoCommit: true });
    await dbc.execute(`DELETE FROM ${bufferInfo}`, {}, { autoCommit: true });
  });

  after(async () => {
    const { closeOraclePool } = require('../../oracleRunner.js');
    cts?.dispose();
    controller?.dispose();
    if (dbc) {
      await dropPackage(dbc, TAGS_PKG);
      await dropPackage(dbc, STREAM_PKG);
      // O buffer é tabela comum (não temporary): as linhas do run sobreviveriam
      // a sessão, então saem junto com os packages. Best-effort — o prefixo
      // pode vir vazio numa instalação local.
      if (bufferTable) {
        await dbc.execute(`DELETE FROM ${bufferTable}`, {}, { autoCommit: true }).catch(() => {});
        await dbc
          .execute(`DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_INFO_TMP`, {}, { autoCommit: true })
          .catch(() => {});
      }

      // Prova de que o drop aconteceu: package sobrando num schema compartilhado
      // envenena os próximos E2E. A verificação NÃO é engolida — se ela falhar,
      // o mocha reporta a falha do hook, que não mascara a do `it` anterior.
      const left = await dbc.execute(
        `SELECT object_name, object_type FROM user_objects
         WHERE object_name IN (:a, :b)
         ORDER BY object_type, object_name`,
        { a: TAGS_PKG, b: STREAM_PKG },
      );
      const leftovers = (left.rows ?? []).map((row) => {
        const [name, type] = Array.isArray(row)
          ? [String(row[0] ?? ''), String(row[1] ?? '')]
          : [
              String((row as Record<string, unknown>).OBJECT_NAME ?? ''),
              String((row as Record<string, unknown>).OBJECT_TYPE ?? ''),
            ];
        return `${name} (${type})`;
      });
      assert.deepStrictEqual(
        leftovers,
        [],
        `cleanup deixou objetos no schema: ${leftovers.join(', ')}`,
      );
      await dbc.close().catch(() => {});
    }
    await closeOraclePool();
  });

  // ── A) filtro de tags ────────────────────────────────────────────────────
  it('a_tags filtra o package: só o it_fast roda (passed=1, skipped=0)', async function () {
    this.timeout(120_000);

    const { TestStateManager } = require('../../state.js');
    const { executeRunOracle } = require('../../oracleRunner.js');

    // State novo por run: `setLastResults`/`setLastFailedItems` são o que o
    // runner escreve, e um state compartilhado esconderia a origem do resultMap.
    const state = new TestStateManager();
    const cap: Capture = { passed: [], failed: [], errored: [], skipped: [], output: [] };
    let counts: Counts | undefined;

    await executeRunOracle(
      {
        connection: conn(),
        pathArgs: [TAGS_PKG],
        coverage: false,
        sourcePath: 'install',
        root: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string,
        run: makeTestRun(cap, 'run-tags', cts.token),
        leafTests: [],
        state,
        folders: vscode.workspace.workspaceFolders,
        tags: TAGS_EXPR,
        onComplete: (p: number, f: number, s: number, e: number, ms: number) => {
          counts = { passed: p, failed: f, skipped: s, errored: e, durationMs: ms };
        },
      },
      cts.token,
    );

    const out = cap.output.join('');
    const ctx = (m: string) => `${m}\nonComplete=${JSON.stringify(counts)}\nsaida:\n${out}`;

    assert.ok(counts, ctx('onComplete deveria ter sido chamado'));
    // passed=2 (e não 1) é exatamente o sintoma de `a_tags` não ter chegado.
    assert.strictEqual(counts.passed, 1, ctx('o filtro de tags deveria rodar só o it_fast'));
    assert.strictEqual(counts.failed, 0, ctx('nenhum teste deveria falhar'));
    assert.strictEqual(counts.errored, 0, ctx('nenhum teste deveria dar erro'));
    // O utPLSQL não marca o teste ignorado como `<skipped/>` — ele simplesmente
    // não o inclui no JUnit. Se algum dia passar a incluir, este E2E avisa.
    assert.strictEqual(counts.skipped, 0, ctx('o teste it_slow não deveria virar skipped'));
    assert.ok(counts.durationMs >= 0, ctx('durationMs deveria ser preenchido'));

    // O reporter de documentação também respeita as tags: a descrição do teste
    // lento não pode aparecer na saída. (Nenhuma outra asserção de texto do
    // reporter — o resumo dele é i18n do utPLSQL e mudaria com o idioma.)
    assert.ok(
      !out.includes(SLOW_DESC),
      ctx(`a saída NÃO deveria citar "${SLOW_DESC}" — o filtro de tags não valeu`),
    );

    // `leafTests` vazio => nada a mapear, mas o parse foi bem-sucedido:
    // resultMap vazio é o resultado coerente, não uma falha silenciosa.
    assert.strictEqual(
      state.getLastResults().size,
      0,
      ctx('sem leafTests o resultMap deveria ficar vazio'),
    );
    assert.strictEqual(state.getLastFailedItems().length, 0, ctx('nada deveria ter falhado'));
    assert.deepStrictEqual(
      [...cap.passed, ...cap.failed, ...cap.errored, ...cap.skipped],
      [],
      ctx('sem leafTests o TestRun não deveria receber status de item'),
    );
  });

  // ── B) streaming do buffer + CDATA partido em chunks ─────────────────────
  it('linha de 10k em CDATA: o JUnit sobrevive ao VARCHAR2(4000) do buffer', async function () {
    this.timeout(120_000);

    const { TestStateManager } = require('../../state.js');
    const { executeRunOracle } = require('../../oracleRunner.js');
    const { parseJUnit } = require('../../junit.js');
    const root = vscode.workspace.workspaceFolders?.[0];
    assert.ok(root, 'a suite precisa de um workspace folder aberto');

    const state = new TestStateManager();
    const cap: Capture = { passed: [], failed: [], errored: [], skipped: [], output: [] };
    let counts: Counts | undefined;

    // Árvore mínima: suite (kind 'suite') + testcase (kind 'test), como o
    // `testTree` monta — é o que o `applyResultsFromCases` casa por
    // `classname` = package minúsculo e `name` = descrição do `%test`.
    const uri = vscode.Uri.joinPath(
      root.uri,
      'db',
      connParts().user.toUpperCase(),
      `${STREAM_PKG}.pks`,
    );
    const suite = controller.createTestItem(`suite:${STREAM_PKG}`, 'Stream E2E', uri);
    state.setMeta(suite, { kind: 'suite', packageName: STREAM_PKG, uri, folder: root });
    const item = controller.createTestItem(
      `test:${STREAM_PKG.toLowerCase()}.${BIG_PROC}`,
      BIG_DESC,
      uri,
    );
    state.setMeta(item, {
      kind: 'test',
      packageName: STREAM_PKG,
      procName: BIG_PROC,
      description: BIG_DESC,
      uri,
      folder: root,
    });
    suite.children.add(item);
    controller.items.add(suite);
    state.cachedItems.push(suite);
    state.setSuiteItem(suite.id, suite);
    state.setItem(item.id, item);

    await executeRunOracle(
      {
        connection: conn(),
        pathArgs: [STREAM_PKG],
        coverage: false,
        sourcePath: 'install',
        root: root.uri.fsPath,
        run: makeTestRun(cap, 'run-stream', cts.token),
        leafTests: [item],
        state,
        folders: vscode.workspace.workspaceFolders,
        // Habilita DBMS_OUTPUT na conn1 (que roda os testes) e drena no fim.
        dbmsOutput: true,
        onComplete: (p: number, f: number, s: number, e: number, ms: number) => {
          counts = { passed: p, failed: f, skipped: s, errored: e, durationMs: ms };
        },
      },
      cts.token,
    );

    const out = cap.output.join('');
    const ctx = (m: string) => `${m}\nonComplete=${JSON.stringify(counts)}\nsaida:\n${out}`;

    assert.ok(counts, ctx('onComplete deveria ter sido chamado'));
    assert.strictEqual(counts.passed, 1, ctx('o teste que imprime 10k chars deveria passar'));
    assert.strictEqual(counts.failed, 0, ctx('o teste não deveria falhar'));
    assert.strictEqual(counts.errored, 0, ctx('o teste não deveria dar erro'));
    assert.strictEqual(counts.skipped, 0, ctx('o teste não deveria ser pulado'));

    // Parse não corrompido: o JUnit com CDATA virou testcase e o TestRun recebeu
    // passed() do item certo (via `applyResultsFromCases`).
    assert.ok(cap.passed.includes(item.id), ctx(`TestRun recebeu: ${cap.passed.join(', ')}`));
    assert.strictEqual(state.getLastResults().get(item.id)?.status, 'passed', ctx('resultMap'));
    assert.strictEqual(state.getLastFailedItems().length, 0, ctx('nada deveria ter falhado'));

    // ── o buffer REAL, lido DEPOIS do run (sem limpar antes) ───────────────
    // Só `text`, já ordenado por message_id: o `firstCol` tolera
    // OUT_FORMAT_ARRAY e OUT_FORMAT_OBJECT, então o global não é mexido.
    const r = await dbc.execute(`SELECT text FROM ${bufferTable} ORDER BY message_id`, {});
    const chunks: string[] = (r.rows ?? []).map(firstCol);
    assert.ok(chunks.length > 0, 'o buffer deveria ter linhas depois do run');

    // `TEXT` é VARCHAR2(4000): a linha de 10.000 chars tem de ter vindo partida
    // em vários chunks, e nenhum deles pode ter sido truncado.
    const maxLen = Math.max(...chunks.map((c) => c.length));
    assert.ok(
      maxLen >= MIN_CHUNK_LEN,
      `deveria existir um chunk TEXT com >= ${MIN_CHUNK_LEN} chars, maior veio: ${maxLen}`,
    );

    // Montagem 1: exatamente o que o `executeRunOracle` faz — cada TEXT seguido
    // de '\n' — e é o que vai para o `parseJUnit`.
    const xml = chunks.map((c) => `${c}\n`).join('');
    // Montagem 2: o round-trip cru dos chunks, sem o separador. O '\n' de
    // produção corta a corrida de 'U' em cada fronteira de chunk (o maior pedaço
    // contíguo fica em ~4.000), então a contagem de >= 9.000 mede os TEXT como
    // vieram do banco — que é o que prova que nenhum VARCHAR2 perdeu a cauda.
    const raw = chunks.join('');

    assert.ok(xml.includes('<![CDATA['), 'o XML montado deveria abrir um CDATA');
    assert.ok(xml.includes(']]>'), 'o XML montado deveria fechar o CDATA');
    assert.ok(xml.includes('<testcase'), 'o XML montado deveria ter o testcase');
    assert.ok(xml.includes('</testsuites>'), 'o XML montado deveria estar fechado');

    const uRun = maxRunOf(raw, 'U');
    assert.ok(
      uRun >= MIN_U_RUN,
      `o CDATA deveria trazer >= ${MIN_U_RUN} 'U' seguidos, veio: ${uRun}`,
    );

    // O mesmo XML pelo MESMO parser do runner: CDATA de 10k chars não pode
    // corromper o `fast-xml-parser`.
    const xmlStart = xml.indexOf('<?xml');
    assert.ok(xmlStart >= 0, 'o XML montado deveria ter a declaração');
    const cases = parseJUnit(xml.slice(xmlStart));
    assert.strictEqual(
      cases.length,
      1,
      `parseJUnit achou ${cases.length} casos: ${JSON.stringify(cases)}`,
    );
    assert.strictEqual(cases[0].status, 'passed', ctx(`status do caso: ${cases[0].status}`));
    assert.strictEqual(cases[0].name, BIG_DESC, ctx(`nome do caso: ${cases[0].name}`));
  });
});
