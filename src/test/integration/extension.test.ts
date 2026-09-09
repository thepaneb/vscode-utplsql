/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';

const COMMANDS = [
  'utplsql.runAll',
  'utplsql.refresh',
  'utplsql.runFile',
  'utplsql.runFileCoverage',
  'utplsql.runFolder',
  'utplsql.runFolderCoverage',
  'utplsql.cancelRun',
  'utplsql.showInfo',
  'utplsql.selectReporter',
  'utplsql.clearConnection',
] as const;

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}

const describeDB = hasConnection() ? describe : describe.skip;

describe('utPLSQL extension', () => {
  let ext: vscode.Extension<unknown> | undefined;

  before(async () => {
    ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('é encontrada e ativa sem erro', () => {
    assert.ok(ext, 'extensão paneb.vscode-utplsql não encontrada');
    assert.strictEqual(ext?.isActive, true);
  });

  it('registra os comandos do menu de contexto', async () => {
    const cmds = await vscode.commands.getCommands(true);
    for (const c of COMMANDS) {
      assert.ok(cmds.includes(c), `comando ausente: ${c}`);
    }
  });

  it('utplsql.refresh executa sem erro', async () => {
    await vscode.commands.executeCommand('utplsql.refresh');
  });

  it('utplsql.clearConnection executa sem erro', async () => {
    await vscode.commands.executeCommand('utplsql.clearConnection');
  });

  it('utplsql.cancelRun executa sem erro quando não há execução ativa', async () => {
    await vscode.commands.executeCommand('utplsql.cancelRun');
  });

  describe('runFolder', () => {
    it('utplsql.runFolder com pasta fixtures retorna warning (nenhuma suite se sem banco)', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri;
      assert.ok(root, 'workspace folder required');
      const fixturesUri = vscode.Uri.joinPath(root, 'src', 'test', 'integration', 'fixtures');
      // Não deve lançar (mostra warning se sem suites, mas não quebra)
      await vscode.commands.executeCommand('utplsql.runFolder', fixturesUri);
    });
  });

  describeDB('integração com banco Oracle', () => {
    it('utplsql.runAll executa todos os testes', async function () {
      this.timeout(120_000);
      await vscode.commands.executeCommand('utplsql.runAll');
    });

    it('utplsql.runFile com arquivo ativo (sem cobertura)', async function () {
      this.timeout(120_000);
      const root = vscode.workspace.workspaceFolders?.[0]?.uri;
      assert.ok(root, 'workspace folder required');
      const fixtureUri = vscode.Uri.joinPath(
        root,
        'src',
        'test',
        'integration',
        'fixtures',
        'test_math.pks',
      );
      const doc = await vscode.workspace.openTextDocument(fixtureUri);
      await vscode.window.showTextDocument(doc);
      await vscode.commands.executeCommand('utplsql.runFile', fixtureUri);
    });

    it('utplsql.runFileCoverage com arquivo ativo', async function () {
      this.timeout(120_000);
      const root = vscode.workspace.workspaceFolders?.[0]?.uri;
      assert.ok(root, 'workspace folder required');
      const fixtureUri = vscode.Uri.joinPath(
        root,
        'src',
        'test',
        'integration',
        'fixtures',
        'test_math.pks',
      );
      const doc = await vscode.workspace.openTextDocument(fixtureUri);
      await vscode.window.showTextDocument(doc);
      await vscode.commands.executeCommand('utplsql.runFileCoverage', fixtureUri);
    });

    it('utplsql.runFolder com pasta fixtures', async function () {
      this.timeout(120_000);
      const root = vscode.workspace.workspaceFolders?.[0]?.uri;
      assert.ok(root, 'workspace folder required');
      const fixturesUri = vscode.Uri.joinPath(root, 'src', 'test', 'integration', 'fixtures');
      await vscode.commands.executeCommand('utplsql.runFolder', fixturesUri);
    });

    it('utplsql.runFolderCoverage com pasta fixtures', async function () {
      this.timeout(120_000);
      const root = vscode.workspace.workspaceFolders?.[0]?.uri;
      assert.ok(root, 'workspace folder required');
      const fixturesUri = vscode.Uri.joinPath(root, 'src', 'test', 'integration', 'fixtures');
      await vscode.commands.executeCommand('utplsql.runFolderCoverage', fixturesUri);
    });

    it('utplsql.additionalReporters com reporter extra', async function () {
      this.timeout(120_000);
      const config = vscode.workspace.getConfiguration('utplsql');
      const original = config.inspect<string[]>('additionalReporters');
      await config.update(
        'additionalReporters',
        ['UT_DOCUMENTATION_REPORTER'],
        vscode.ConfigurationTarget.Workspace,
      );
      try {
        await vscode.commands.executeCommand('utplsql.runAll');
      } finally {
        await config.update(
          'additionalReporters',
          original?.workspaceValue ?? original?.defaultValue ?? [],
          vscode.ConfigurationTarget.Workspace,
        );
      }
    });

    it('utplsql.rerunLast repete última execução', async function () {
      this.timeout(120_000);
      await vscode.commands.executeCommand('utplsql.runAll');
      await vscode.commands.executeCommand('utplsql.rerunLast');
    });

    it('utplsql.runFailed executa sem erro', async function () {
      this.timeout(120_000);
      const root = vscode.workspace.workspaceFolders?.[0]?.uri;
      assert.ok(root, 'workspace folder required');
      const fixtureUri = vscode.Uri.joinPath(
        root,
        'src',
        'test',
        'integration',
        'fixtures',
        'test_math.pks',
      );
      await vscode.commands.executeCommand('utplsql.runFile', fixtureUri);
      await vscode.commands.executeCommand('utplsql.runFailed');
    });

    describe('oracle pool (PRD-38)', () => {
      it('reutiliza pool entre execuções e devolve conexões', async function () {
        this.timeout(120_000);
        let oracledb: typeof import('oracledb');
        try {
          const mod = await import('oracledb');
          oracledb =
            ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
            (mod as typeof import('oracledb'));
        } catch {
          this.skip();
          return;
        }
        await vscode.commands.executeCommand('utplsql.runAll');
        await vscode.commands.executeCommand('utplsql.runAll');
        const pool = oracledb.getPool();
        assert.ok(pool, 'pool default não encontrado após execução');
        assert.strictEqual(pool.connectionsInUse, 0);
        assert.ok(
          pool.connectionsOpen >= 2,
          `pool deveria manter poolMin(2) conexões, tem ${pool.connectionsOpen}`,
        );
      });
    });

    describe('descoberta via DB no modo schema (PRD-43)', () => {
      it('discoverSchemaFromDb descobre suites de packages sem arquivo local', async function () {
        this.timeout(60_000);
        const conn = process.env.UTPLSQL_CONN as string;
        const folders = vscode.workspace.workspaceFolders ?? [];
        const { discoverSchemaFromDb } = await import('../../discovery.js');

        const user = conn.split('/')[0];
        const schemas = [...new Set([user, 'UTPLSQL_TEST'])];
        const discovered = (
          await Promise.all(schemas.map((schema) => discoverSchemaFromDb(conn, schema, folders)))
        ).flat();

        assert.ok(
          discovered.some((s) => s.packageName.toLowerCase() === 'test_math'),
          'test_math deveria ser descoberto via ALL_OBJECTS/ALL_SOURCE',
        );
        for (const s of discovered) {
          assert.strictEqual(
            s.uri.scheme,
            'utplsql-db',
            `URI virtual esperado para ${s.packageName}`,
          );
        }
      });

      it('discoverSchemaFromDb com schema inexistente retorna vazio sem erro', async function () {
        this.timeout(60_000);
        const conn = process.env.UTPLSQL_CONN as string;
        const folders = vscode.workspace.workspaceFolders ?? [];
        const { discoverSchemaFromDb } = await import('../../discovery.js');
        const result = await discoverSchemaFromDb(conn, 'SCHEMA_NAO_EXISTE_XYZ', folders);
        assert.deepStrictEqual(result, []);
      });

      it('refresh no modo schema mescla suites do banco sem erro', async function () {
        this.timeout(60_000);
        const root = vscode.workspace.workspaceFolders?.[0]?.uri;
        assert.ok(root, 'workspace folder required');
        const schemaDir = vscode.Uri.joinPath(root, 'db', 'UT3');
        await vscode.workspace.fs.createDirectory(schemaDir);

        const config = vscode.workspace.getConfiguration('utplsql');
        const origOrg = config.inspect<string>('organization');
        const origPattern = config.inspect<string>('organization.schemaPattern');
        try {
          await config.update('organization', 'schema', vscode.ConfigurationTarget.Workspace);
          await config.update(
            'organization.schemaPattern',
            'db/{schema}/**',
            vscode.ConfigurationTarget.Workspace,
          );
          await vscode.commands.executeCommand('utplsql.refresh');
        } finally {
          await config.update(
            'organization',
            origOrg?.workspaceValue !== undefined ? origOrg.workspaceValue : undefined,
            vscode.ConfigurationTarget.Workspace,
          );
          await config.update(
            'organization.schemaPattern',
            origPattern?.workspaceValue !== undefined ? origPattern.workspaceValue : undefined,
            vscode.ConfigurationTarget.Workspace,
          );
          await vscode.workspace.fs.delete(vscode.Uri.joinPath(root, 'db'), { recursive: true });
          await vscode.commands.executeCommand('utplsql.refresh');
        }
      });
    });
  });
});
