/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { installOutFormatIsolation } from './helpers';

// Multi-root: a extensão deve carregar e descobrir suítes com **duas** pastas de
// workspace (uma árvore por pasta). Roda apenas sob a config dedicada
// (`.vscode-test.multiroot.mjs`, workspace = `fixtures/e2e-multiroot.code-workspace`);
// sob a config single-root (base) os testes são pulados.
//
// Gate: UTPLSQL_CONN no .env + >= 2 workspace folders.

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const folderCount = vscode.workspace.workspaceFolders?.length ?? 0;
const describeMulti = hasConnection() && folderCount >= 2 ? describe : describe.skip;

describeMulti('multi-root — 2 pastas de workspace (integração)', () => {
  installOutFormatIsolation();

  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('expõe exatamente 2 pastas no workspace', () => {
    assert.strictEqual(vscode.workspace.workspaceFolders?.length, 2);
  });

  it('discoverWorkspace encontra suítes nas 2 pastas (uma árvore por pasta)', async function () {
    this.timeout(60_000);
    const { discoverWorkspace } = await import('../../discovery.js');
    const suites = await discoverWorkspace(['**/*.pks'], vscode.workspace.workspaceFolders);
    assert.ok(suites.length > 0, 'discoverWorkspace deveria encontrar suítes');
    const folders = new Set(suites.map((s) => s.folder.name));
    assert.strictEqual(
      folders.size,
      2,
      `suítes deveriam vir de 2 pastas distintas; veio de: ${[...folders].join(', ')}`,
    );
  });

  it('refresh descobre suítes em ambas as pastas sem lançar', async function () {
    this.timeout(120_000);
    await vscode.commands.executeCommand('utplsql.refresh');
  });

  it('runAll com 2 pastas não lança', async function () {
    this.timeout(120_000);
    await vscode.commands.executeCommand('utplsql.runAll');
  });
});
