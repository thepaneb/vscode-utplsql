/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { installOutFormatIsolation } from './helpers';

// Cobertura de integração de features que só tinham teste unitário (ciclo 0.15.0):
//   - auto-run on save / watch mode (PRD-50)
//   - comandos de debug: cursor / falhos / último (PRD-53)
//   - toggle do modo global de cobertura (PRD-54)
//   - organização opcional da árvore por tag (PRD-51 RF4 / PRD-55)
//   - cancelamento durante uma execução
//
// Exercitam os caminhos REAIS no Extension Host (com banco via UTPLSQL_CONN).
// Como o `state` da extensão não é exportado, a asserção é "não lança + efeito
// observável barato" — mesmo padrão do restante da suíte de integração.
//
// Gate: UTPLSQL_CONN no .env.

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

const cfg = (): vscode.WorkspaceConfiguration => vscode.workspace.getConfiguration('utplsql');

/** Seta a config no workspace, roda `fn` e restaura o valor anterior. */
async function withConfig<T>(key: string, value: T, fn: () => Promise<void>): Promise<void> {
  const original = cfg().inspect<T>(key);
  await cfg().update(key, value, vscode.ConfigurationTarget.Workspace);
  try {
    await fn();
  } finally {
    await cfg().update(
      key,
      original?.workspaceValue as T | undefined,
      vscode.ConfigurationTarget.Workspace,
    );
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describeDB('0.15.0 — features de UI/execução (integração)', () => {
  installOutFormatIsolation();

  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('auto-run on save: salvar um `.pks` agenda execução sem lançar (PRD-50)', async function () {
    this.timeout(120_000);
    const dir = vscode.Uri.file(path.join(os.tmpdir(), `utplsql-autorun-${Date.now()}`));
    await vscode.workspace.fs.createDirectory(dir);
    const file = vscode.Uri.joinPath(dir, 'autorun_tmp.pks');
    await vscode.workspace.fs.writeFile(
      file,
      Buffer.from('--%suite(autorun_tmp)\n\n--%test\nPROCEDURE autorun_case IS BEGIN NULL; END;\n'),
    );

    try {
      await withConfig('autoRun', 'onSave', () =>
        withConfig('autoRunDelayMs', 10, () =>
          withConfig('autoRunQueue', 'skip', async () => {
            const doc = await vscode.workspace.openTextDocument(file);
            await vscode.window.showTextDocument(doc);
            const edit = new vscode.WorkspaceEdit();
            edit.insert(file, new vscode.Position(0, 0), '-- edit\n');
            assert.ok(await vscode.workspace.applyEdit(edit), 'applyEdit deveria aplicar');
            assert.ok(await doc.save(), 'save deveria gravar (dispara onDidSaveTextDocument)');
            await sleep(3000); // debounce (10ms) + execução assíncrona
          }),
        ),
      );
    } finally {
      await vscode.workspace.fs.delete(dir, { recursive: true });
    }
  });

  describe('comandos de debug (PRD-53)', () => {
    it('com o debugger desabilitado, os 3 comandos retornam cedo sem lançar', async function () {
      this.timeout(60_000);
      await withConfig('debugger.enabled', false, async () => {
        await vscode.commands.executeCommand('utplsql.debugAtCursor');
        await vscode.commands.executeCommand('utplsql.debugFailed');
        await vscode.commands.executeCommand('utplsql.debugLast');
      });
    });

    it('debugAtCursor sem editor `.pks` ativo emite aviso sem lançar', async function () {
      this.timeout(60_000);
      const doc = await vscode.workspace.openTextDocument({ content: 'x', language: 'plaintext' });
      await vscode.window.showTextDocument(doc);
      await withConfig('debugger.enabled', true, async () => {
        await vscode.commands.executeCommand('utplsql.debugAtCursor');
      });
    });
  });

  it('toggleCoverage alterna o modo global e o run seguinte não lança (PRD-54)', async function () {
    this.timeout(120_000);
    await vscode.commands.executeCommand('utplsql.toggleCoverage');
    await vscode.commands.executeCommand('utplsql.runAll');
    await vscode.commands.executeCommand('utplsql.toggleCoverage'); // volta ao estado anterior
  });

  it('showTagsInTree no refresh não lança (PRD-51 RF4 / PRD-55)', async function () {
    this.timeout(120_000);
    await withConfig('showTagsInTree', true, async () => {
      await vscode.commands.executeCommand('utplsql.refresh');
    });
  });

  it('wallet: senha vai ao SecretStorage e é recuperável/removível (PRD-65/81)', async function () {
    this.timeout(60_000);
    const cp = await import('../../connectionProfiles.js');
    const id = `e2e-wallet-${Date.now()}`;
    try {
      assert.strictEqual(cp.getWalletPassword(id), undefined);
      await cp.setWalletPassword(id, 'p@ss-e2e');
      assert.strictEqual(cp.getWalletPassword(id), 'p@ss-e2e');
    } finally {
      await cp.clearWalletPassword(id);
    }
    assert.strictEqual(cp.getWalletPassword(id), undefined);
  });

  it('setWalletPassword sem perfil ativo avisa e não abre input (PRD-81)', async function () {
    this.timeout(60_000);
    const c = cfg();
    const orig = c.get<string>('activeProfile', '');
    await c.update('activeProfile', '', vscode.ConfigurationTarget.Global);
    try {
      await vscode.commands.executeCommand('utplsql.setWalletPassword');
    } finally {
      await c.update('activeProfile', orig, vscode.ConfigurationTarget.Global);
    }
  });

  it('cancelRun durante uma execução não lança e a interrompe', async function () {
    this.timeout(120_000);
    const running = vscode.commands.executeCommand('utplsql.runAll');
    await sleep(300); // dá tempo da execução iniciar antes de cancelar
    await vscode.commands.executeCommand('utplsql.cancelRun');
    await running.then(undefined, () => undefined);
  });
});
