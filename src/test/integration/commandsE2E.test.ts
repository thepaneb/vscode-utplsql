/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { installOutFormatIsolation } from './helpers';

// Exercita no Extension Host os handlers de comando que não tinham E2E direto:
// runAtCursor/runLens, showTestExplorer, copyGrantsToClipboard, validateSetup,
// recompileUt3, switchProfile (sem perfis), manageProfiles e os guards do
// script runner. Gate: UTPLSQL_CONN no .env.

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

describeDB('comandos E2E — handlers sem cobertura direta', () => {
  installOutFormatIsolation();
  let root: vscode.Uri;
  let testingCmd: vscode.Disposable | undefined;

  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
    root = vscode.workspace.workspaceFolders?.[0]?.uri as vscode.Uri;
    assert.ok(root, 'workspace folder required');
    // O host de teste não registra a view de testes; stuba para o handler não
    // deixar promise rejeitada.
    try {
      testingCmd = vscode.commands.registerCommand('workbench.view.testing', () => {});
    } catch {
      /* já registrado */
    }
    await vscode.commands.executeCommand('utplsql.refresh');
  });

  after(async () => {
    testingCmd?.dispose();
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  function fixture(name: string): vscode.Uri {
    return vscode.Uri.joinPath(root, 'src', 'test', 'integration', 'fixtures', name);
  }

  async function openAt(name: string, predicate: (line: string) => boolean): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(fixture(name));
    const editor = await vscode.window.showTextDocument(doc);
    const line = doc
      .getText()
      .split(/\r?\n/)
      .findIndex((l) => predicate(l));
    assert.ok(line >= 0, `anotação não encontrada em ${name}`);
    editor.selection = new vscode.Selection(line, 0, line, 0);
  }

  it('utplsql.runAtCursor na linha do %suite executa a suite', async function () {
    this.timeout(180_000);
    await openAt('test_math.pks', (l) => l.includes('%suite'));
    await vscode.commands.executeCommand('utplsql.runAtCursor');
  });

  it('utplsql.runAtCursor na linha do %test executa o teste', async function () {
    this.timeout(180_000);
    await openAt('test_math.pks', (l) => l.includes('%test'));
    await vscode.commands.executeCommand('utplsql.runAtCursor');
  });

  it('utplsql.runLens com a suite explícita executa o arquivo', async function () {
    this.timeout(180_000);
    const uri = fixture('test_math.pks');
    await vscode.commands.executeCommand('utplsql.runLens', {
      type: 'suite',
      packageName: 'test_math',
      uri: uri.toString(),
      coverage: false,
    });
  });

  it('utplsql.showTestExplorer revela a view de testes', async function () {
    this.timeout(30_000);
    await vscode.commands.executeCommand('utplsql.showTestExplorer');
  });

  it('utplsql.copyGrantsToClipboard copia os grants', async function () {
    this.timeout(30_000);
    await vscode.commands.executeCommand('utplsql.copyGrantsToClipboard');
    const text = await vscode.env.clipboard.readText();
    assert.ok(text.includes('GRANT EXECUTE ON SYS.DBMS_PROFILER'), `clipboard: ${text}`);
    assert.ok(text.includes('GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE'));
  });

  it('utplsql.validateSetup roda as validações sem lançar', async function () {
    this.timeout(180_000);
    await vscode.commands.executeCommand('utplsql.validateSetup');
  });

  it('utplsql.recompileUt3 recompila o schema utPLSQL', async function () {
    this.timeout(180_000);
    await vscode.commands.executeCommand('utplsql.recompileUt3');
  });

  it('utplsql.switchProfile sem perfis avisa e não altera nada', async function () {
    this.timeout(30_000);
    const config = vscode.workspace.getConfiguration('utplsql');
    assert.deepStrictEqual(config.get('profiles'), [], 'não deveria haver perfis salvos');
    await vscode.commands.executeCommand('utplsql.switchProfile');
  });

  it('utplsql.manageProfiles abre as settings', async function () {
    this.timeout(30_000);
    await vscode.commands.executeCommand('utplsql.manageProfiles');
  });

  it('utplsql.runScript sem editor ativo avisa', async function () {
    this.timeout(30_000);
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await vscode.commands.executeCommand('utplsql.runScript');
  });
});
