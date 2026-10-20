/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { UtplsqlCodeLensProvider } from '../../codelens';
import { readConfig } from '../../config';
import { discoverWorkspace } from '../../discovery';
import {
  buildLanguageGlobs,
  currentLanguageContributions,
  workspaceAssociations,
} from '../../languageIdentity';
import { closeOraclePool, executeRunOracle, listReportersForConnection } from '../../oracleRunner';
import { TestStateManager } from '../../state';

// Integração da release 0.17.0 (segue o padrão de v016-features):
//   - PRD-109: `.tps` recebe a linguagem `plsql` e CodeLens;
//   - PRD-105: validado nos unitários (JSON dos snippets);
//   - PRD-108: coberto no bloco com banco (HTML de cobertura).

const TMP_DIR = path.join(__dirname, '../../../src/test/integration/fixtures/tmp-v017');

const TPS_SRC = `CREATE OR REPLACE PACKAGE ut_v017_tps IS
  --%suite(v0.17 TPS)

  --%test(passa)
  PROCEDURE ok;
END ut_v017_tps;
`;

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

function makeRun(): {
  run: vscode.TestRun;
  output: string[];
} {
  const output: string[] = [];
  const run = {
    appendOutput: (text: string) => output.push(text),
    passed: () => {},
    failed: () => {},
    skipped: () => {},
    errored: () => {},
    started: () => {},
    enqueued: () => {},
    end: () => {},
    addCoverage: () => {},
  } as unknown as vscode.TestRun;
  return { run, output };
}

function makeState(): TestStateManager {
  return new TestStateManager();
}

function cancelToken(): vscode.CancellationToken {
  return {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  } as vscode.CancellationToken;
}

describe('0.17.0 — PRD-109 (sem banco)', () => {
  after(() => removeFixtures());

  it('reconhece .tps como plsql e gera CodeLens', async () => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    const file = path.join(TMP_DIR, 'ut_v017_tps.tps');
    fs.writeFileSync(file, TPS_SRC);

    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    assert.strictEqual(doc.languageId, 'plsql');

    const provider = new UtplsqlCodeLensProvider();
    const lenses = provider.provideCodeLenses(doc, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    } as vscode.CancellationToken);

    assert.strictEqual(lenses.length, 4, 'suite + test devem gerar 2 lenses cada');
  });
});

describe('0.17.0 — PRD-109 (files.associations e CodeLens)', () => {
  const ASSOC_DIR = path.join(TMP_DIR, 'assoc');
  const ASSOC_EXT = '.v017assoc';
  const ASSOC_FILE = path.join(ASSOC_DIR, `ut_v017_assoc${ASSOC_EXT}`);
  const filesConfig = vscode.workspace.getConfiguration('files');
  let previousAssociations: Record<string, string> | undefined;

  before(async () => {
    fs.mkdirSync(ASSOC_DIR, { recursive: true });
    fs.writeFileSync(ASSOC_FILE, TPS_SRC.replace(/ut_v017_tps/g, 'ut_v017_assoc'));
    previousAssociations =
      filesConfig.inspect<Record<string, string>>('associations')?.workspaceValue;
    await filesConfig.update(
      'associations',
      { ...(previousAssociations ?? {}), [`*${ASSOC_EXT}`]: 'sql' },
      vscode.ConfigurationTarget.Workspace,
    );
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  after(async () => {
    await filesConfig.update(
      'associations',
      previousAssociations,
      vscode.ConfigurationTarget.Workspace,
    );
    fs.rmSync(ASSOC_DIR, { recursive: true, force: true });
  });

  it('descobre a suite pela associação e gera CodeLens', async () => {
    const cfg = readConfig();
    const patterns = [
      ...new Set([
        ...cfg.includePatterns,
        ...buildLanguageGlobs(
          cfg.discoveryLanguageIds,
          currentLanguageContributions(),
          workspaceAssociations(),
        ),
      ]),
    ];
    const suites = await discoverWorkspace(patterns, vscode.workspace.workspaceFolders ?? []);
    assert.ok(
      suites.some((suite) => suite.uri.fsPath === ASSOC_FILE),
      'suite .v017assoc deveria ser descoberta via files.associations',
    );

    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(ASSOC_FILE));
    assert.strictEqual(doc.languageId, 'sql', 'files.associations deveria definir sql');
    const lenses = new UtplsqlCodeLensProvider().provideCodeLenses(doc, cancelToken());
    assert.strictEqual(lenses.length, 4, 'suite + test devem gerar 2 lenses cada');
  });

  it('não duplica CodeLens no provider registrado para .pks', async () => {
    const file = path.join(ASSOC_DIR, 'ut_v017_dup.pks');
    fs.writeFileSync(file, TPS_SRC.replace(/ut_v017_tps/g, 'ut_v017_dup'));
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    await vscode.window.showTextDocument(doc);
    const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      'vscode.executeCodeLensProvider',
      doc.uri,
    );
    const runLenses = (lenses ?? []).filter((lens) => lens.command?.command === 'utplsql.runLens');
    assert.strictEqual(
      runLenses.length,
      4,
      `esperava 4 lenses do utPLSQL, recebeu ${runLenses.length}`,
    );
  });

  it('respeita discovery.languageIds restrito', async () => {
    const file = path.join(ASSOC_DIR, 'ut_v017_restrict.tps');
    fs.writeFileSync(file, TPS_SRC.replace(/ut_v017_tps/g, 'ut_v017_restrict'));
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    const cfg = vscode.workspace.getConfiguration('utplsql');
    const previous = cfg.inspect<string[]>('discovery.languageIds')?.workspaceValue;
    try {
      await cfg.update('discovery.languageIds', [], vscode.ConfigurationTarget.Workspace);
      const lenses = new UtplsqlCodeLensProvider().provideCodeLenses(doc, cancelToken());
      assert.strictEqual(lenses.length, 0, 'sem languageIds o .tps não deve ter CodeLens');
    } finally {
      await cfg.update('discovery.languageIds', previous, vscode.ConfigurationTarget.Workspace);
    }
    const lenses = new UtplsqlCodeLensProvider().provideCodeLenses(doc, cancelToken());
    assert.strictEqual(lenses.length, 4, 'ao restaurar a setting o .tps volta a ter CodeLens');
  });
});

describe('0.17.0 — PRD-105 (snippets no editor)', () => {
  const SNIP_DIR = path.join(TMP_DIR, 'snippets');
  const SNIP_FILE = path.join(SNIP_DIR, 'ut_v017_snip.pks');

  before(() => {
    fs.mkdirSync(SNIP_DIR, { recursive: true });
    fs.writeFileSync(SNIP_FILE, TPS_SRC.replace(/ut_v017_tps/g, 'ut_v017_snip'));
  });

  after(() => fs.rmSync(SNIP_DIR, { recursive: true, force: true }));

  it('oferece ut-suite e ut-nls-cursor no completion', async () => {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(SNIP_FILE));
    await vscode.window.showTextDocument(doc);
    const list = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      doc.uri,
      new vscode.Position(2, 2),
      undefined,
    );
    assert.ok(list, 'completion list ausente');
    const items = list.items;
    const bodyOf = (item: vscode.CompletionItem): string =>
      typeof item.insertText === 'string' ? item.insertText : (item.insertText?.value ?? '');

    const suite = items.find(
      (item) =>
        item.kind === vscode.CompletionItemKind.Snippet &&
        bodyOf(item).includes('CREATE OR REPLACE PACKAGE') &&
        bodyOf(item).includes('--%suite'),
    );
    assert.ok(suite, 'snippet ut-suite não apareceu no completion');
    assert.ok(bodyOf(suite).includes('--%suitepath'));

    const nls = items.find(
      (item) =>
        item.kind === vscode.CompletionItemKind.Snippet && bodyOf(item).includes('ut.set_nls'),
    );
    assert.ok(nls, 'snippet ut-nls-cursor não apareceu no completion');
    assert.match(bodyOf(nls), /ut\.reset_nls/);
  });
});

const DB_SPEC = 'UT_V017IT_HTML';
const DB_SPEC_SRC = `CREATE OR REPLACE PACKAGE ${DB_SPEC} IS
  --%suite(v0.17 HTML)

  --%test(passa)
  PROCEDURE ok;
END ${DB_SPEC};
`;
const DB_BODY_SRC = `CREATE OR REPLACE PACKAGE BODY ${DB_SPEC} AS
  PROCEDURE ok IS
  BEGIN
    NULL;
  END ok;
END ${DB_SPEC};
`;

describeDB('0.17.0 — PRD-108 (com banco)', () => {
  let conn: import('oracledb').Connection;

  beforeEach(async () => {
    conn = await openRaw();
    await conn.execute(
      `BEGIN EXECUTE IMMEDIATE 'DROP PACKAGE ${DB_SPEC}'; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -4043 THEN RAISE; END IF; END;`,
    );
    await conn.execute(DB_SPEC_SRC, {}, { autoCommit: true });
    await conn.execute(DB_BODY_SRC, {}, { autoCommit: true });
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
    await conn.execute(
      `BEGIN ut_runner.rebuild_annotation_cache(:owner); END;`,
      {
        owner: {
          dir: oracledb.BIND_IN,
          type: oracledb.STRING,
          val: connParts().user.toUpperCase(),
        },
      },
      { autoCommit: true },
    );
  });

  afterEach(async () => {
    try {
      await conn.execute(
        `BEGIN EXECUTE IMMEDIATE 'DROP PACKAGE ${DB_SPEC}'; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -4043 THEN RAISE; END IF; END;`,
      );
    } finally {
      await conn.close();
      await closeOraclePool();
      removeFixtures();
    }
  });

  it('gera test-results/coverage.html sem contaminar o output', async function () {
    const reporters = await listReportersForConnection(
      process.env.UTPLSQL_CONN as string,
      readConfig(),
    );
    if (!reporters.some((r) => /html/i.test(r))) this.skip();

    const { run, output } = makeRun();
    let reportPath: string | undefined;
    await executeRunOracle(
      {
        connection: process.env.UTPLSQL_CONN as string,
        pathArgs: [DB_SPEC],
        coverage: true,
        coverageHtmlReport: true,
        reportRoot: TMP_DIR,
        onCoverageHtmlReport: (filePath) => {
          reportPath = filePath;
        },
        sourcePath: TMP_DIR,
        run,
        leafTests: [],
        state: makeState(),
        folders: vscode.workspace.workspaceFolders ?? [],
        timeoutMinutes: 5,
      },
      {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => {} }),
      } as vscode.CancellationToken,
    );

    assert.ok(reportPath, 'callback do HTML deveria ser chamado');
    assert.strictEqual(reportPath, path.join(TMP_DIR, 'test-results', 'coverage.html'));
    const html = fs.readFileSync(reportPath as string, 'utf8');
    assert.match(html, /<!DOCTYPE html>/i);
    assert.match(html, /Code coverage/i);
    assert.ok(
      !output.join('\n').includes('<!DOCTYPE html>'),
      'HTML não deve ser despejado no output do Test Explorer',
    );
  });
});
