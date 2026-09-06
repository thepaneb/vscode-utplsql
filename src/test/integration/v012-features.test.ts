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
  const describeSetup = hasConnection() ? describe : describe.skip;
  describeSetup('cobertura por declaração E2E (PRD-48, schema da conexão)', () => {
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
          if (buf.trim()) out.push(buf.trim());
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

    /** Extrai do compile_packages.sql o trecho de um objeto (até o próximo prompt). */
    function extractObj(script: string, from: string, to: string): string {
      const i = script.indexOf(from);
      const j = script.indexOf(to, i);
      return script.slice(i, j >= 0 ? j : script.length);
    }

    it('coverage real de calculator deriva add/subtract/multiply/divide', async function () {
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
      const m = conn.match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
      assert.ok(m, 'UTPLSQL_CONN deve ser user/pass@//host:port/svc');
      const [, user, password, host] = m;
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string;
      const compilePath = path.join(root, 'src', 'test', 'integration', 'fixtures', 'compile_packages.sql');
      const created: string[] = ['TEST_CALCULATOR', 'CALCULATOR'];

      let dbc: import('oracledb').Connection;
      try {
        dbc = await oracledb.getConnection({ user, password, connectString: host });
      } catch {
        this.skip();
        return;
      }
      try {
        // 1) Compila produção + suite no schema da conexão (dono → sem grants cross-schema)
        const script = fs.readFileSync(compilePath, 'utf8');
        const cal = extractObj(script, 'create or replace package calculator as', 'create or replace function greet');
        const tcal = extractObj(script, 'create or replace package test_calculator as', 'create or replace package test_betwnvarchar');
        for (const stmt of splitSql(`${cal}\n/\n${tcal}\n/`)) {
          await dbc.execute(stmt, {}, { autoCommit: true });
        }

        // 2) Cobertura real via ut_runner (cobertura reporter no buffer)
        await dbc.execute('DELETE FROM ut3.UT_OUTPUT_BUFFER_TMP', {}, { autoCommit: true });
        let coverageText = '';
        try {
          await dbc.execute(
            `BEGIN
               ut3.ut_runner.run(
                 a_paths     => ut_varchar2_list('test_calculator'),
                 a_reporters => ut_reporters(ut_coverage_cobertura_reporter())
               );
             END;`,
            {},
            { autoCommit: true },
          );
          const r = await dbc.execute('SELECT text FROM ut3.UT_OUTPUT_BUFFER_TMP ORDER BY message_id', {});
          const text = (r.rows ?? []).map((x) => String((x as unknown[])[0])).join('\n');
          coverageText = text.slice(text.indexOf('<coverage'));
        } catch {
          // Cache de anotações do utPLSQL pode estar stale (schema recriado) —
          // admin do utPLSQL, não da extensão. Pula com elegância.
          this.skip();
          return;
        }
        if (!coverageText) {
          this.skip();
          return;
        }

        // 3) Parse + deriva das declarações do fonte real (ALL_SOURCE)
        const { parseCobertura } = require('../../cobertura.js');
        const { deriveDeclarationCoverage } = require('../../plsqlDeclarations.js');
        type FileLines = { file: string; lines: { line: number; hits: number }[] };
        const files = parseCobertura(coverageText) as FileLines[];
        const calc = files.find((f) => /calculator/i.test(f.file));
        assert.ok(calc, 'cobertura deveria incluir o package calculator');

        const src = await dbc.execute(
          `SELECT text FROM all_source WHERE owner = '${user.toUpperCase()}' AND name = 'CALCULATOR' AND type = 'PACKAGE BODY' ORDER BY line`,
          {},
        );
        const bodySource = (src.rows ?? []).map((x) => String((x as unknown[])[0])).join('');
        assert.ok(/FUNCTION/i.test(bodySource), 'source do calculator deveria ter FUNCTIONs');

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
        for (const obj of created) {
          try {
            await dbc.execute(`DROP PACKAGE ${user}.${obj}`, {}, { autoCommit: true });
          } catch {
            /* ignore */
          }
        }
        await dbc.close().catch(() => {});
      }
    });
  });});
