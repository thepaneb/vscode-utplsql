/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
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
  const workspaceFile = vscode.workspace.workspaceFile;
  const workspacePath = workspaceFile?.scheme === 'file' ? workspaceFile.fsPath : undefined;
  let originalWorkspace: string | undefined;

  before(async () => {
    if (workspacePath) {
      originalWorkspace = fs.readFileSync(workspacePath, 'utf8');
    }
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  after(() => {
    // `files.associations` é window-scoped; o VS Code regrava o .code-workspace
    // com `settings: {}` ao remover a setting. Restaura o fixture byte a byte.
    if (workspacePath && originalWorkspace !== undefined) {
      fs.writeFileSync(workspacePath, originalWorkspace);
    }
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

  it('resolveRunRoots cobre as 2 pastas em execução (PRD-57)', async () => {
    const { resolveRunRoots } = await import('../../matching.js');
    const folders = vscode.workspace.workspaceFolders ?? [];
    const metas = folders.map((f) => ({
      kind: 'suite' as const,
      packageName: 'pkg',
      uri: f.uri,
      folder: f,
    }));
    const roots = resolveRunRoots(metas as never, folders).sort();
    assert.deepStrictEqual(
      roots,
      folders.map((f) => f.uri.fsPath).sort(),
      'as duas pastas deveriam entrar na resolução de root da execução',
    );
  });

  it('files.associations + multi-root atribui a suíte à pasta correta (PRD-109)', async function () {
    this.timeout(120_000);
    const folder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(folder, 'primeira pasta do multi-root ausente');
    const ext = '.v017multi';
    const file = path.join(folder.uri.fsPath, `ut_v017_multi${ext}`);
    // `files.associations` é window-scoped (não aceita Folder Settings), então
    // o teste valida a associação global + a resolução da pasta da suíte.
    const cfg = vscode.workspace.getConfiguration('files');
    const previous = cfg.inspect<Record<string, string>>('associations')?.workspaceValue;
    fs.writeFileSync(
      file,
      `CREATE OR REPLACE PACKAGE ut_v017_multi IS
  --%suite(v0.17 multi)

  --%test(passa)
  PROCEDURE ok;
END ut_v017_multi;
`,
    );
    try {
      await cfg.update(
        'associations',
        { ...(previous ?? {}), [`*${ext}`]: 'sql' },
        vscode.ConfigurationTarget.Workspace,
      );
      const [
        { readConfig },
        { buildLanguageGlobs, currentLanguageContributions, workspaceAssociations },
        { discoverWorkspace },
      ] = await Promise.all([
        import('../../config.js'),
        import('../../languageIdentity.js'),
        import('../../discovery.js'),
      ]);
      const config = readConfig();
      const patterns = [
        ...new Set([
          ...config.includePatterns,
          ...buildLanguageGlobs(
            config.discoveryLanguageIds,
            currentLanguageContributions(),
            workspaceAssociations(),
          ),
        ]),
      ];
      const suites = await discoverWorkspace(patterns, vscode.workspace.workspaceFolders);
      const found = suites.find((suite) => suite.uri.fsPath === file);
      assert.ok(found, 'suite .v017multi deveria ser descoberta via associação');
      assert.strictEqual(
        found?.folder.name,
        folder.name,
        'a suíte deveria ser atribuída à pasta que contém o arquivo',
      );
    } finally {
      await cfg.update('associations', previous, vscode.ConfigurationTarget.Workspace);
      fs.rmSync(file, { force: true });
    }
  });
});
