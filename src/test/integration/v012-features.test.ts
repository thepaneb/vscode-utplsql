/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

// Testes de integração das features 0.12.0 contra o banco Oracle real.
// Gate: UTPLSQL_CONN no .env (mesma regra do extension.test.ts).

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

const dummyToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
};

describeDB('v0.12.0 — integração com banco Oracle', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  describe('perfis de conexão (PRD-34)', () => {
    afterEach(async () => {
      const cfg = vscode.workspace.getConfiguration('utplsql');
      await cfg.update('activeProfile', undefined, vscode.ConfigurationTarget.Workspace);
      await cfg.update('profiles', undefined, vscode.ConfigurationTarget.Workspace);
    });

    it('resolveConnectionNoPrompt usa a conexão do perfil ativo', async () => {
      const conn = process.env.UTPLSQL_CONN as string;
      const { resolveConnectionNoPrompt } = require('../../config.js');
      const cfg = vscode.workspace.getConfiguration('utplsql');
      await cfg.update(
        'profiles',
        [{ id: 'int-pro', name: 'IT', connection: conn }],
        vscode.ConfigurationTarget.Workspace,
      );
      await cfg.update('activeProfile', 'int-pro', vscode.ConfigurationTarget.Workspace);

      assert.strictEqual(resolveConnectionNoPrompt(), conn);
    });

    it('alternar entre dois perfis troca a conexão resolvida (A → B)', async () => {
      const conn = process.env.UTPLSQL_CONN as string;
      const { resolveConnectionNoPrompt } = require('../../config.js');
      const cfg = vscode.workspace.getConfiguration('utplsql');
      await cfg.update(
        'profiles',
        [
          { id: 'pA', name: 'A', connection: `${conn}` },
          { id: 'pB', name: 'B', connection: `B/override@//localhost:1521/XEPDB1` },
        ],
        vscode.ConfigurationTarget.Workspace,
      );

      await cfg.update('activeProfile', 'pA', vscode.ConfigurationTarget.Workspace);
      assert.strictEqual(resolveConnectionNoPrompt(), conn);

      await cfg.update('activeProfile', 'pB', vscode.ConfigurationTarget.Workspace);
      assert.strictEqual(
        resolveConnectionNoPrompt(),
        'B/override@//localhost:1521/XEPDB1',
      );
    });

    it('executa testes usando a conexão do perfil ativo', async function () {
      this.timeout(120_000);
      const conn = process.env.UTPLSQL_CONN as string;
      const cfg = vscode.workspace.getConfiguration('utplsql');
      await cfg.update(
        'profiles',
        [{ id: 'int-pro', name: 'IT', connection: conn }],
        vscode.ConfigurationTarget.Workspace,
      );
      await cfg.update('activeProfile', 'int-pro', vscode.ConfigurationTarget.Workspace);

      const root = vscode.workspace.workspaceFolders?.[0]?.uri;
      assert.ok(root);
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
  });

  describe('cobertura por declaração (PRD-48)', () => {
    it('deriveDeclarationCoverage deriva declarações de cobertura real do banco', async function () {
      this.timeout(120_000);
      const cfg = vscode.workspace.getConfiguration('utplsql');
      const cliPath = cfg.get<string>('cliPath') ?? process.env.UTPLSQL_CLI_PATH ?? '';
      const conn = process.env.UTPLSQL_CONN as string;
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      assert.ok(cliPath, 'utplsql.cliPath deve estar configurado');
      assert.ok(root);

      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ut-int-'));
      const covPath = path.join(tmp, 'coverage.xml');
      try {
        const { runCli } = require('../../cli.js');
        const sourcePath = cfg.get<string>('sourcePath', 'install');
        const owner =
          cfg.get<string>('coverageOwner', '') || conn.split('/')[0].toUpperCase();
        const coverageSourceArgs = cfg.get<string[]>('coverageSourceArgs', []);
        const schema = conn.split('/')[0];
        const args = [
          'run',
          conn,
          `-p=test_math`,
          '-f=ut_coverage_cobertura_reporter',
          `-o=${covPath}`,
          `-source_path=${sourcePath}`,
          `-owner=${owner}`,
          ...coverageSourceArgs,
        ];
        void schema;
        const result = await runCli(cliPath, args, true, root, dummyToken);
        assert.strictEqual(result.code, 0, result.stderr || 'cli falhou');
        assert.ok(fs.existsSync(covPath), 'coverage.xml deveria ter sido gerado');

        const { parseCobertura } = require('../../cobertura.js');
        const { resolveSourceUri } = require('../../coverage.js');
        const { deriveDeclarationCoverage } = require('../../plsqlDeclarations.js');
        type FileLines = { file: string; lines: { line: number; hits: number }[] };
        const files = parseCobertura(fs.readFileSync(covPath, 'utf8')) as FileLines[];
        if (files.length === 0) {
          this.skip();
          return;
        }

        // Localiza o fonte de cada objeto coberto: mapeamento do workspace OU
        // busca ampla por nome sob <root>/install/** (layout real dos usuários).
        const walk = (dir: string, out: string[]): void => {
          let entries: string[];
          try {
            entries = fs.readdirSync(dir);
          } catch {
            return;
          }
          for (const e of entries) {
            const full = path.join(dir, e);
            let st;
            try {
              st = fs.statSync(full);
            } catch {
              continue;
            }
            if (st.isDirectory()) walk(full, out);
            else if (e.toLowerCase().endsWith('.sql')) out.push(full);
          }
        };
        const installFiles: string[] = [];
        walk(path.join(root, sourcePath), installFiles);
        const byName = new Map<string, string>();
        for (const f of installFiles) {
          byName.set(path.basename(f).replace(/\.sql$/i, '').toLowerCase(), f);
        }

        let derived = 0;
        for (const f of files) {
          let uri = resolveSourceUri(f.file, root, sourcePath);
          if (!uri) {
            const base = path.basename(f.file).replace(/\.sql$/i, '').toLowerCase();
            const found = byName.get(base);
            if (found) uri = vscode.Uri.file(found);
          }
          if (!uri) continue;
          const text = fs.readFileSync(uri.fsPath, 'utf8');
          derived += deriveDeclarationCoverage(text, f.lines).length;
        }
        assert.ok(
          derived > 0,
          'deveria derivar declarações PROCEDURE/FUNCTION da cobertura real do schema',
        );
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  describe('internacionalização (PRD-49)', () => {
    it('setting utplsql.language en/pt-br controla getExtensionLocale e t()', async () => {
      const cfg = vscode.workspace.getConfiguration('utplsql');
      const { getExtensionLocale } = require('../../config.js');
      const { t } = require('../../i18n.js');

      await cfg.update('language', 'en', vscode.ConfigurationTarget.Workspace);
      try {
        assert.strictEqual(getExtensionLocale(), 'en');
        assert.strictEqual(t(getExtensionLocale(), 'ext.noConnection'), 'Oracle connection not set.');
      } finally {
        await cfg.update('language', undefined, vscode.ConfigurationTarget.Workspace);
      }

      await cfg.update('language', 'pt-br', vscode.ConfigurationTarget.Workspace);
      try {
        assert.strictEqual(getExtensionLocale(), 'pt-br');
        assert.strictEqual(t(getExtensionLocale(), 'ext.noConnection'), 'Conexão Oracle não informada.');
      } finally {
        await cfg.update('language', undefined, vscode.ConfigurationTarget.Workspace);
      }
    });
  });

  describe('rastreio de views (PRD-12)', () => {
    it('sqlCoverageEnabled=true não quebra o run quando V$SQL é inacessível', async function () {
      this.timeout(120_000);
      const cfg = vscode.workspace.getConfiguration('utplsql');
      await cfg.update('sqlCoverageEnabled', true, vscode.ConfigurationTarget.Workspace);
      try {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri;
        assert.ok(root);
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
        // Com V$SQL inacessível, o rastreio de views degrada com aviso — não lança.
        await vscode.commands.executeCommand('utplsql.runFile', fixtureUri);
      } finally {
        await cfg.update('sqlCoverageEnabled', undefined, vscode.ConfigurationTarget.Workspace);
      }
    });
  });
});