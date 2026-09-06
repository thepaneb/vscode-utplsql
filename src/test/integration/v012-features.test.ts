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

  // ── PRD-48 E2E: setup do schema UTPLSQL_TEST (sysdba) + cobertura real ──
  const sysConn = process.env.UTPLSQL_SYS_CONN;
  const describeSetup = hasConnection() && sysConn ? describe : describe.skip;
  describeSetup('cobertura por declaração E2E (PRD-48, UTPLSQL_TEST)', () => {
    /** Divide um script sqlplus em statements: blocos PL/SQL (CREATE OR
     * REPLACE PACKAGE/PROCEDURE/FUNCTION/TYPE/TRIGGER ou DECLARE) terminam
     * em '/'; DDL/DML simples termina em ';'. */
    function splitSql(text: string): string[] {
      const blockStart =
        /^(CREATE\s+OR\s+REPLACE\s+(PACKAGE(\s+BODY)?|PROCEDURE|FUNCTION|TYPE(\s+BODY)?|TRIGGER)\b|DECLARE\b)/i;
      const out: string[] = [];
      let buf = '';
      for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.replace(/\s+$/, '');
        const t = line.trim();
        if (!t || t.startsWith('--') || /^(set |prompt |show |define |spool |whenever )/i.test(t)) {
          continue;
        }
        if (t === '/') {
          if (buf.trim()) out.push(buf.trim().replace(/;\s*$/, ''));
          buf = '';
          continue;
        }
        buf += (buf ? '\n' : '') + line;
        if (line.endsWith(';') && !blockStart.test(buf)) {
          out.push(buf.trim());
          buf = '';
        }
      }
      if (buf.trim()) out.push(buf.trim());
      return out;
    }

    it('setup UTPLSQL_TEST + coverage de calculator deriva 4 declarações', async function () {
      this.timeout(180_000);
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

      const conn = process.env.UTPLSQL_CONN as string;
      const host = conn.match(/@\/\/(.+)$/)?.[1] as string; // localhost:1521/freepdb1
      const testConn = `utplsql_test/utplsql_test#2026@//${host}`;
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string;
      const setupPath = path.join(root, 'src', 'test', 'integration', 'fixtures', 'setup.sql');
      const compilePath = path.join(root, 'src', 'test', 'integration', 'fixtures', 'compile_packages.sql');
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ut-int-'));
      const covPath = path.join(tmp, 'coverage.xml');

      const sysMatch = sysConn!.match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
      assert.ok(sysMatch, 'UTPLSQL_SYS_CONN deve ser sys/pass@//host:port/svc');
      const [, sysUser, sysPass, sysHost] = sysMatch;

      try {
        // 1) Setup do schema (sysdba)
        const sys = await oracledb.getConnection({
          user: sysUser,
          password: sysPass,
          connectString: sysHost,
          privilege: oracledb.SYSDBA,
        });
        try {
          const setupText = fs
            .readFileSync(setupPath, 'utf8')
            .replace(/&ut3_owner/g, 'UT3');
          for (const stmt of splitSql(setupText)) {
            await sys.execute(stmt, {}, { autoCommit: true });
          }
        } finally {
          await sys.close().catch(() => {});
        }

        // 2) Compila produção + testes (UTPLSQL_TEST)
        const ut = await oracledb.getConnection({ user: 'utplsql_test', password: 'utplsql_test#2026', connectString: host });
        try {
          const compileText = fs.readFileSync(compilePath, 'utf8');
          for (const stmt of splitSql(compileText)) {
            await ut.execute(stmt, {}, { autoCommit: true });
          }
        } finally {
          await ut.close().catch(() => {});
        }

        // 3) Cobertura real de test_calculator (exercita o package calculator)
        const cliPath =
          vscode.workspace.getConfiguration('utplsql').get<string>('cliPath') ??
          process.env.UTPLSQL_CLI_PATH ??
          '';
        const { runCli } = require('../../cli.js');
        const result = await runCli(
          cliPath,
          [
            'run',
            testConn,
            '-p=test_calculator',
            '-f=ut_coverage_cobertura_reporter',
            `-o=${covPath}`,
            '-owner=UTPLSQL_TEST',
          ],
          true,
          root,
          dummyToken,
        );
        assert.strictEqual(result.code, 0, result.stderr || 'cli de cobertura falhou');
        assert.ok(fs.existsSync(covPath), 'coverage.xml deveria existir');

        const { parseCobertura } = require('../../cobertura.js');
        const { deriveDeclarationCoverage } = require('../../plsqlDeclarations.js');
        type FileLines = { file: string; lines: { line: number; hits: number }[] };
        const files = parseCobertura(fs.readFileSync(covPath, 'utf8')) as FileLines[];
        const calc = files.find((f) => /calculator/i.test(f.file));
        assert.ok(calc, 'cobertura deveria incluir o package calculator');
        assert.ok(calc.lines.length > 0, 'calculator deveria ter linhas cobertas');

        // 4) Fonte real do body via ALL_SOURCE
        const src = await oracledb.getConnection({ user: 'utplsql_test', password: 'utplsql_test#2026', connectString: host });
        let bodySource = '';
        try {
          const res = await src.execute(
            `SELECT text FROM all_source WHERE owner = 'UTPLSQL_TEST'
               AND name = 'CALCULATOR' AND type = 'PACKAGE BODY' ORDER BY line`,
            {},
          );
          const rows = (res.rows ?? []) as unknown[][];
          bodySource = rows.map((r) => String(r[0])).join('');
        } finally {
          await src.close().catch(() => {});
        }
        assert.ok(/FUNCTION/i.test(bodySource), 'source do calculator deveria ter FUNCTIONs');

        // 5) Deriva declarações da cobertura real + fonte real
        type Decl = { name: string; executed: boolean; line: number };
        const decls = deriveDeclarationCoverage(bodySource, calc.lines) as Decl[];
        const names = decls.map((d: Decl) => d.name.toUpperCase());
        assert.ok(
          ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'].every((n) => names.includes(n)),
          `deveria derivar add/subtract/multiply/divide, veio: ${names.join(', ')}`,
        );
        assert.ok(
          decls.some((d: Decl) => d.executed),
          'pelo menos uma declaração deveria estar executada',
        );
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });
});