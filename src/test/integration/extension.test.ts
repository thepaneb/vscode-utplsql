import * as assert from 'assert';
import * as vscode from 'vscode';

// Testes de integração: rodam dentro de uma instância do VSCode (host de extensão).
// Executados via `npm run test:integration` (@vscode/test-cli, UI mocha bdd).

describe('utPLSQL extension', () => {
  it('é encontrada e ativa sem erro', async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    assert.ok(ext, 'extensão paneb.vscode-utplsql não encontrada');
    await ext!.activate();
    assert.strictEqual(ext!.isActive, true);
  });

  it('registra os comandos do menu de contexto', async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext!.activate();

    const cmds = await vscode.commands.getCommands(true);
    for (const c of [
      'utplsql.runAll',
      'utplsql.refresh',
      'utplsql.runFile',
      'utplsql.runFileCoverage',
      'utplsql.runFolder',
      'utplsql.runFolderCoverage'
    ]) {
      assert.ok(cmds.includes(c), `comando ausente: ${c}`);
    }
  });
});
