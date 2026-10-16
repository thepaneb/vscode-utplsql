/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { parseSuiteText } from '../../suiteParser';
import { installOutFormatIsolation } from './helpers';

// Integração da release 0.16.0 (segue o padrão de v012/v013/v014-features):
//   - PRD-59/100: scaffold de suíte (comando + Code Action) gerando um `.pks` real;
//   - PRD-58: Run Related Tests (comando registrado e execução sem lançar);
//   - PRD-56/57: cobertos nos unitários (durante/resolução por folder) e no
//     `multiRootE2E` (matriz de pastas).
//
// Os casos de banco são gated por `UTPLSQL_CONN` no `.env` (describeDB).

const SUFFIX = 'v016it';
const PROD_BASE = `app_pkg_${SUFFIX}`;
const SPEC_BASE = `ut_${PROD_BASE}`;
const SPEC_PKG = SPEC_BASE.toUpperCase();
const ORPHAN_BASE = `sem_suite_${SUFFIX}`;

const TMP_DIR = path.join(__dirname, '../../../src/test/integration/fixtures/tmp-v016');

const PROD_SRC = `CREATE OR REPLACE PACKAGE BODY ${PROD_BASE} AS
  PROCEDURE is_valid IS BEGIN NULL; END;
  FUNCTION total RETURN NUMBER IS BEGIN RETURN 0; END;
END ${PROD_BASE};
`;

const SPEC_SRC = `CREATE OR REPLACE PACKAGE ${SPEC_BASE} IS
  --%suite(${PROD_BASE} v0.16 IT)

  --%test(sempre passa)
  PROCEDURE ok;
END ${SPEC_BASE};
`;

const ORPHAN_SRC = `CREATE OR REPLACE PACKAGE BODY ${ORPHAN_BASE} AS
  PROCEDURE nada IS BEGIN NULL; END;
END ${ORPHAN_BASE};
`;

function writeFixture(name: string, content: string): string {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const file = path.join(TMP_DIR, name);
  fs.writeFileSync(file, content);
  return file;
}

function removeFixtures(): void {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

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

describe('0.16.0 — comandos e scaffold (sem banco)', () => {
  after(() => removeFixtures());

  it('registra os comandos novos da versão', async () => {
    const cmds = await vscode.commands.getCommands(true);
    assert.ok(cmds.includes('utplsql.generateTestSuite'), 'generateTestSuite deveria existir');
    assert.ok(cmds.includes('utplsql.runRelated'), 'runRelated deveria existir');
  });

  it('generateTestSuite cria ut_<pkg>.pks parseável a partir do .pkb', async () => {
    const prodFile = writeFixture(`${PROD_BASE}.pkb`, PROD_SRC);
    const generated = path.join(TMP_DIR, `${SPEC_BASE}.pks`);
    try {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(prodFile));
      await vscode.window.showTextDocument(doc);

      await vscode.commands.executeCommand('utplsql.generateTestSuite');

      assert.ok(fs.existsSync(generated), `${SPEC_BASE}.pks deveria ter sido criado`);
      const parsed = parseSuiteText(fs.readFileSync(generated, 'utf8'));
      assert.ok(parsed, 'o template gerado deveria ser reconhecido como suite');
      assert.strictEqual(parsed?.packageName, SPEC_BASE);
      assert.deepStrictEqual(
        parsed?.tests.map((t) => t.procName),
        ['is_valid', 'total'],
      );
    } finally {
      fs.rmSync(prodFile, { force: true });
      fs.rmSync(generated, { force: true });
    }
  });

  it('Code Action de gerar suíte aparece só em produção', async () => {
    const prodFile = writeFixture(`${PROD_BASE}.pkb`, PROD_SRC);
    const specFile = writeFixture(`${SPEC_BASE}.pks`, SPEC_SRC);
    const zero = new vscode.Range(0, 0, 0, 0);
    const titles = async (file: string): Promise<string[]> => {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
      const actions = (await vscode.commands.executeCommand(
        'vscode.executeCodeActionProvider',
        doc.uri,
        zero,
      )) as vscode.CodeAction[];
      return (actions ?? []).map((a) => a.title);
    };
    try {
      const onProd = await titles(prodFile);
      assert.ok(
        onProd.some((t) => /generate test suite/i.test(t)),
        `esperava a Code Action de scaffold em produção; veio: ${onProd.join(' | ')}`,
      );

      const onSpec = await titles(specFile);
      assert.ok(
        !onSpec.some((t) => /generate test suite/i.test(t)),
        'não deveria oferecer scaffold numa spec ut_*',
      );
    } finally {
      fs.rmSync(prodFile, { force: true });
      fs.rmSync(specFile, { force: true });
    }
  });
});

describeDB('0.16.0 — Run Related Tests (integração com banco)', () => {
  installOutFormatIsolation();

  after(() => removeFixtures());

  async function createSuitePackage(dbc: import('oracledb').Connection): Promise<void> {
    await dbc
      .execute(
        `BEGIN EXECUTE IMMEDIATE 'DROP PACKAGE ${SPEC_PKG}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
        {},
        { autoCommit: true },
      )
      .catch(() => {});
    await dbc.execute(
      `CREATE OR REPLACE PACKAGE ${SPEC_PKG} AS
         --%suite(${PROD_BASE} v0.16 IT)
         --%test(sempre passa)
         PROCEDURE ok;
       END ${SPEC_PKG};`,
      {},
      { autoCommit: true },
    );
    await dbc.execute(
      `CREATE OR REPLACE PACKAGE BODY ${SPEC_PKG} AS
         PROCEDURE ok IS BEGIN NULL; END ok;
       END ${SPEC_PKG};`,
      {},
      { autoCommit: true },
    );
    const owner = connParts().user.toUpperCase();
    await dbc.execute(
      `BEGIN ut3.ut_runner.rebuild_annotation_cache(a_object_owner => :owner); END;`,
      { owner },
      { autoCommit: true },
    );
  }

  it('runRelated executa a suite relacionada sem lançar', async function () {
    this.timeout(180_000);
    const dbc = await openRaw();
    const prodFile = writeFixture(`${PROD_BASE}.pkb`, PROD_SRC);
    const specFile = writeFixture(`${SPEC_BASE}.pks`, SPEC_SRC);
    try {
      await createSuitePackage(dbc);
      await vscode.commands.executeCommand('utplsql.refresh');

      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(prodFile));
      await vscode.window.showTextDocument(doc);

      await vscode.commands.executeCommand('utplsql.runRelated');
    } finally {
      fs.rmSync(prodFile, { force: true });
      fs.rmSync(specFile, { force: true });
      await dbc
        .execute(
          `BEGIN EXECUTE IMMEDIATE 'DROP PACKAGE ${SPEC_PKG}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
          {},
          { autoCommit: true },
        )
        .catch(() => {});
      await dbc.close().catch(() => {});
    }
  });

  it('runRelated sem correspondência avisa e não lança', async function () {
    this.timeout(60_000);
    const orphan = writeFixture(`${ORPHAN_BASE}.pkb`, ORPHAN_SRC);
    try {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(orphan));
      await vscode.window.showTextDocument(doc);

      await vscode.commands.executeCommand('utplsql.runRelated');
    } finally {
      fs.rmSync(orphan, { force: true });
    }
  });
});
