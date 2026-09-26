/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { installOutFormatIsolation } from './helpers';

// E2E da cobertura de views (rastreio por V$SQL): cria DUAS views REAIS no
// schema da conexão, executa explicitamente SÓ a primeira e chama o
// `applySqlCoverage` de produção — sem loader fake, sem mock do oracledb.
//
// O unit test (`viewCoverage.test.ts`) cobre o match por nome com sql_text
// sintetico. O que só o banco real prova aqui: acesso ao V$SQL, o filtro
// `command_type = 3 AND executions > 0 AND parsing_schema_name = <owner>` e a
// emissao de 100%/0% por linha no TestRun + no TestStateManager.
//
// Os nomes das views levam um sufixo numérico único por execução: assim o
// "executada" não pode ser um falso positivo deixado por uma execução anterior
// ainda no V$SQL, e a "não executada" nunca aparece por acidente.

const describeDB = process.env.UTPLSQL_CONN ? describe : describe.skip;

/** Sufixo alfanumérico-numérico único por execução (< 30 chars com o prefixo). */
const SUFFIX = `${Date.now().toString(36)}${process.pid % 997}`.slice(-6).toUpperCase();
/** View que sera EXECUTADA no teste. */
const EXEC_VIEW = `UT3VCX${SUFFIX}`;
/** View criada mas NUNCA executada. */
const NOEXEC_VIEW = `UT3VCN${SUFFIX}`;

/** 3 linhas (sem newline final) → `readLines` devolve 3 StatementCoverage. */
function viewSql(name: string): string {
  return [`CREATE VIEW ${name} AS`, 'SELECT 1 AS C1', 'FROM dual'].join('\n');
}

/** Mesma query do `applySqlCoverage` — usada só como pré-condição real. */
const VSQL_QUERY = `SELECT sql_text FROM v$sql
     WHERE command_type = 3 AND executions > 0 AND parsing_schema_name = :owner`;

function sqlTextsFrom(rows: unknown[]): string[] {
  return rows
    .map((r) => {
      if (Array.isArray(r)) return String(r[0] ?? '');
      return String((r as Record<string, unknown>).SQL_TEXT ?? '');
    })
    .filter(Boolean)
    .map((s) => s.toUpperCase());
}

/** Mesmo critério de palavra do `matchExecutedViews` (word boundary em A-Z0-9_). */
function mentions(texts: string[], objectName: string): boolean {
  const re = new RegExp(`(?:^|[^A-Z0-9_])${objectName}(?:[^A-Z0-9_]|$)`);
  return texts.some((t) => re.test(t));
}

/**
 * Aguarda (poll curto) o V$SQL expor a execução da view. Sem mock: se o dado
 * não aparecer, o teste falha na pré-condição em vez de passar por engano.
 */
async function waitForExecuted(
  conn: import('oracledb').Connection,
  owner: string,
  attempts = 20,
): Promise<string[]> {
  let texts: string[] = [];
  for (let i = 0; i < attempts; i++) {
    const res = await conn.execute(VSQL_QUERY, { owner });
    texts = sqlTextsFrom(res.rows ?? []);
    if (mentions(texts, EXEC_VIEW)) return texts;
    await new Promise((r) => setTimeout(r, 250));
  }
  return texts;
}

interface Capture {
  output: string[];
  coverage: vscode.FileCoverage[];
}

/** Token criado apenas quando a suíte roda (não aloca recursos em `describe.skip`). */
let runCts: vscode.CancellationTokenSource | undefined;

/** `applySqlCoverage` só usa appendOutput/addCoverage; o resto é o contrato. */
function makeRun(cap: Capture): vscode.TestRun {
  return {
    id: 'view-coverage-e2e',
    name: 'view coverage E2E',
    token: runCts?.token as vscode.CancellationToken,
    get isCancellationRequested() {
      return runCts?.token.isCancellationRequested ?? false;
    },
    start: () => {},
    end: () => {},
    enqueued: () => {},
    started: () => {},
    passed: () => {},
    failed: () => {},
    errored: () => {},
    skipped: () => {},
    appendOutput: (text: string) => {
      cap.output.push(text);
    },
    addCoverage: (fc: vscode.FileCoverage) => {
      cap.coverage.push(fc);
    },
    addError: () => {},
    addMessage: () => {},
    addWorkspaceFolder: () => {},
    removeWorkspaceFolder: () => {},
  } as unknown as vscode.TestRun;
}

describeDB('viewCoverage E2E — V$SQL real -> cobertura por view (executada 100%)', () => {
  installOutFormatIsolation();

  before(() => {
    runCts = new vscode.CancellationTokenSource();
  });

  after(() => runCts?.dispose());

  it('cobre 1 para a view executada e 0 para a nao executada, sem aviso de V$SQL', async function () {
    this.timeout(120_000);

    const { applySqlCoverage } =
      require('../../viewCoverage.js') as typeof import('../../viewCoverage');
    const { TestStateManager } = require('../../state.js') as typeof import('../../state');
    const { closeOraclePool, parseConnString } =
      require('../../oracleRunner.js') as typeof import('../../oracleRunner');
    const { t } = require('../../i18n.js') as typeof import('../../i18n');
    const { getExtensionLocale } = require('../../config.js') as typeof import('../../config');

    const connection = process.env.UTPLSQL_CONN as string;
    const { user, password, connectionString } = parseConnString(connection);
    const owner = user.toUpperCase();

    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));

    // `<root>/install/views/<nome>.sql` — o layout que `discoverViewFiles` varre.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-vsqlcov-'));
    const viewsDir = path.join(root, 'install', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });

    const execFile = path.join(viewsDir, `${EXEC_VIEW}.sql`);
    const noExecFile = path.join(viewsDir, `${NOEXEC_VIEW}.sql`);
    fs.writeFileSync(execFile, viewSql(EXEC_VIEW), 'utf8');
    fs.writeFileSync(noExecFile, viewSql(NOEXEC_VIEW), 'utf8');
    const expectedLines = viewSql(EXEC_VIEW).split('\n').length;

    let conn: import('oracledb').Connection | undefined;
    try {
      conn = await oracledb.getConnection({ user, password, connectionString });

      for (const view of [EXEC_VIEW, NOEXEC_VIEW]) {
        await conn.execute(`DROP VIEW ${view}`, {}, { autoCommit: true }).catch(() => {});
        await conn.execute(viewSql(view), {}, { autoCommit: true });
      }

      // Executa SOMENTE a primeira view (a segunda nunca e consultada).
      const sel = await conn.execute(`SELECT * FROM ${EXEC_VIEW}`);
      assert.ok((sel.rows?.length ?? 0) > 0, `SELECT em ${EXEC_VIEW} deveria retornar linhas`);

      // Pré-condição: o V$SQL precisa expor a execução (e NAO a da outra view).
      const texts = await waitForExecuted(conn, owner);
      assert.ok(
        mentions(texts, EXEC_VIEW),
        `V$SQL nao expôs a execucao de ${EXEC_VIEW} (command_type=3, executions>0)`,
      );
      assert.ok(
        !mentions(texts, NOEXEC_VIEW),
        `${NOEXEC_VIEW} nao deveria aparecer no V$SQL — o teste perderia o sentido`,
      );

      const state = new TestStateManager();
      const cap: Capture = { output: [], coverage: [] };
      const folder = {
        uri: vscode.Uri.file(root),
        name: 'root',
        index: 0,
      } as vscode.WorkspaceFolder;

      await applySqlCoverage({
        connection,
        root,
        sourcePath: 'install',
        run: makeRun(cap),
        state,
        folders: [folder],
      });

      // 1) Sem o aviso de V$SQL negado (nenhum output foi produzido).
      const out = cap.output.join('\n');
      assert.ok(
        !out.includes(t(getExtensionLocale(), 'viewCoverage.vsqlDenied')),
        `não deveria avisar V$SQL negado: ${out}`,
      );
      assert.ok(!/V\$SQL|V_\$SQL/.test(out), `nenhum output deveria citar o V$SQL: ${out}`);

      // 2) Exatamente um FileCoverage por view descoberta.
      assert.strictEqual(cap.coverage.length, 2, `coberturas: ${cap.coverage.length}`);

      // 3) Os paths são os arquivos criados.
      const expectedUris = [vscode.Uri.file(execFile), vscode.Uri.file(noExecFile)]
        .map((u) => u.toString())
        .sort();
      const actualUris = cap.coverage.map((fc) => fc.uri.toString()).sort();
      assert.deepStrictEqual(actualUris, expectedUris);
      for (const fc of cap.coverage) {
        assert.ok(fs.existsSync(fc.uri.fsPath), `o path da cobertura não existe: ${fc.uri.fsPath}`);
      }

      // 4) View EXECUTADA: todas as linhas com executed=1.
      const execDetails = state.getCoverage(vscode.Uri.file(execFile).toString());
      assert.strictEqual(execDetails.length, expectedLines, `${EXEC_VIEW}: linhas`);
      execDetails.forEach((d, i) => {
        assert.strictEqual(
          d.executed,
          1,
          `${EXEC_VIEW} linha ${i}: executed=${String(d.executed)}`,
        );
        assert.strictEqual((d.location as vscode.Position).line, i, `${EXEC_VIEW} linha ${i}`);
      });

      // 5) View NÃO executada: todas as linhas com executed=0.
      const noExecDetails = state.getCoverage(vscode.Uri.file(noExecFile).toString());
      assert.strictEqual(noExecDetails.length, expectedLines, `${NOEXEC_VIEW}: linhas`);
      noExecDetails.forEach((d, i) => {
        assert.strictEqual(
          d.executed,
          0,
          `${NOEXEC_VIEW} linha ${i}: executed=${String(d.executed)}`,
        );
        assert.strictEqual((d.location as vscode.Position).line, i, `${NOEXEC_VIEW} linha ${i}`);
      });

      // Guarda: nenhum Uri fora dos dois arquivos criados recebeu cobertura.
      assert.deepStrictEqual(
        state.getCoverage(vscode.Uri.file(path.join(viewsDir, 'OUTRA_VIEW.sql')).toString()),
        [],
      );
    } finally {
      if (conn) {
        for (const view of [EXEC_VIEW, NOEXEC_VIEW]) {
          await conn.execute(`DROP VIEW ${view}`, {}, { autoCommit: true }).catch(() => {});
        }
        await conn.close().catch(() => {});
      }
      await closeOraclePool();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
