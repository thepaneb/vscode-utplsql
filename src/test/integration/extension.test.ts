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

const MODES = ['launcher', 'java'] as const;

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}

const describeDB = hasConnection() ? describe : describe.skip;

// cliHome lido de process.env — repassado ao VSCode host via env no .vscode-test.mjs
const cliHome = process.env.UTPLSQL_CLI_HOME || '';

async function withInvocationMode<T>(mode: string, fn: () => Promise<T>): Promise<T> {
  const config = vscode.workspace.getConfiguration('utplsql');
  const original = config.inspect<string>('invocation');

  await config.update('invocation', mode, vscode.ConfigurationTarget.Workspace);

  // Modo java precisa de cliHome; aplica de process.env se não houver na setting
  if (mode === 'java' && !config.get<string>('cliHome')) {
    await config.update(
      'cliHome',
      process.env.UTPLSQL_CLI_HOME || '',
      vscode.ConfigurationTarget.Workspace,
    );
  }

  try {
    return await fn();
  } finally {
    await config.update(
      'invocation',
      original?.workspaceValue ?? original?.defaultValue ?? 'launcher',
      vscode.ConfigurationTarget.Workspace,
    );
  }
}

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
    for (const mode of MODES) {
      if (mode === 'java' && !cliHome) {
        describe(`modo ${mode}`, () => {
          it.skip('cliHome não configurado — defina UTPLSQL_CLI_HOME no .env', () => {});
        });
        continue;
      }

      describe(`modo ${mode}`, () => {
        it('utplsql.runAll executa todos os testes', async function () {
          this.timeout(120_000);
          await withInvocationMode(mode, async () => {
            await vscode.commands.executeCommand('utplsql.runAll');
          });
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
          await withInvocationMode(mode, async () => {
            await vscode.commands.executeCommand('utplsql.runFile', fixtureUri);
          });
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
          await withInvocationMode(mode, async () => {
            await vscode.commands.executeCommand('utplsql.runFileCoverage', fixtureUri);
          });
        });

        it('utplsql.runFolder com pasta fixtures', async function () {
          this.timeout(120_000);
          const root = vscode.workspace.workspaceFolders?.[0]?.uri;
          assert.ok(root, 'workspace folder required');
          const fixturesUri = vscode.Uri.joinPath(root, 'src', 'test', 'integration', 'fixtures');
          await withInvocationMode(mode, async () => {
            await vscode.commands.executeCommand('utplsql.runFolder', fixturesUri);
          });
        });

        it('utplsql.runFolderCoverage com pasta fixtures', async function () {
          this.timeout(120_000);
          const root = vscode.workspace.workspaceFolders?.[0]?.uri;
          assert.ok(root, 'workspace folder required');
          const fixturesUri = vscode.Uri.joinPath(root, 'src', 'test', 'integration', 'fixtures');
          await withInvocationMode(mode, async () => {
            await vscode.commands.executeCommand('utplsql.runFolderCoverage', fixturesUri);
          });
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
            await withInvocationMode(mode, async () => {
              await vscode.commands.executeCommand('utplsql.runAll');
            });
          } finally {
            await config.update(
              'additionalReporters',
              original?.workspaceValue ?? original?.defaultValue ?? [],
              vscode.ConfigurationTarget.Workspace,
            );
          }
        });
      });
    }
  });
});
