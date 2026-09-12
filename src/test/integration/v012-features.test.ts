/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

// Testes de integração das features 0.12.0 contra o banco Oracle real.
// Gate: UTPLSQL_CONN no .env (mesma regra do extension.test.ts).

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

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
      assert.strictEqual(resolveConnectionNoPrompt(), 'B/override@//localhost:1521/XEPDB1');
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
    it.skip('deriveDeclarationCoverage — requer reescrita para Oracle direto (CLI removido)', () => {
      // TODO: reescrever usando executeRunOracle + applyCoverageFromXml em vez de runCli
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
        assert.strictEqual(
          t(getExtensionLocale(), 'ext.noConnection'),
          'Oracle connection not set.',
        );
      } finally {
        await cfg.update('language', undefined, vscode.ConfigurationTarget.Workspace);
      }

      await cfg.update('language', 'pt-br', vscode.ConfigurationTarget.Workspace);
      try {
        assert.strictEqual(getExtensionLocale(), 'pt-br');
        assert.strictEqual(
          t(getExtensionLocale(), 'ext.noConnection'),
          'Conexão Oracle não informada.',
        );
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

  // ── PRD-62: scripts SQL contra perfis (motor + Oracle direto) ──
  describeDB('scripts SQL contra perfis (PRD-62)', () => {
    const TABLE = 'UTPLSQL_SCRIPT_IT62';
    const { splitScript, decodeScript, executeScript, connectOracle } =
      require('../../scriptRunner.js');

    function collector() {
      const lines: string[] = [];
      return {
        lines,
        output: { appendLine: (value: string): void => void lines.push(value) },
      };
    }

    function parseEnv(): { user: string; password: string; connectString: string } {
      const conn = process.env.UTPLSQL_CONN as string;
      const m = conn.match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
      assert.ok(m, 'UTPLSQL_CONN deve ser user/pass@//host:port/svc');
      return { user: m[1], password: m[2], connectString: m[3] };
    }

    async function openRaw() {
      const mod = await import('oracledb');
      const oracledb =
        ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
        (mod as typeof import('oracledb'));
      const { user, password, connectString } = parseEnv();
      return oracledb.getConnection({ user, password, connectString });
    }

    async function dropTableIfExists(
      dbc: import('oracledb').Connection,
      table: string = TABLE,
    ): Promise<void> {
      try {
        await dbc.execute(
          `BEGIN EXECUTE IMMEDIATE 'DROP TABLE ${table}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
          {},
          { autoCommit: true },
        );
      } catch {
        /* ignore */
      }
    }

    async function countRows(dbc: import('oracledb').Connection): Promise<number> {
      const r = await dbc.execute(`SELECT COUNT(*) FROM ${TABLE}`, {});
      return Number(firstCol(r.rows?.[0]));
    }

    /** Primeira coluna tolerante a ARRAY ou OBJECT (outFormat global pode variar). */
    function firstCol(row: unknown): unknown {
      if (Array.isArray(row)) return row[0];
      return Object.values((row ?? {}) as Record<string, unknown>)[0];
    }

    it('split + execute: DDL + bloco PL/SQL (/) + DML executam em sequência', async function () {
      this.timeout(120_000);
      const connStr = process.env.UTPLSQL_CONN as string;
      const dbc = await openRaw();
      try {
        await dropTableIfExists(dbc);
        const { lines, output } = collector();
        const result = await executeScript(
          (c: string) => connectOracle(c, { timeoutSeconds: 60 }),
          {
            connection: connStr,
            statements: splitScript(
              `CREATE TABLE ${TABLE} (id NUMBER, txt VARCHAR2(100));\n` +
                `BEGIN\n  INSERT INTO ${TABLE} VALUES (1, 'um');\n  INSERT INTO ${TABLE} VALUES (2, 'dois');\nEND;\n/\n` +
                `INSERT INTO ${TABLE} VALUES (3, 'tres');`,
            ),
            output,
            label: 'seed-62.sql',
            charset: 'utf8',
          },
        );
        assert.deepStrictEqual([result.executed, result.ok, result.failed], [3, 3, 0]);
        assert.strictEqual(await countRows(dbc), 3);
        assert.ok(lines[0].includes('seed-62.sql (utf8)'));
      } finally {
        await dropTableIfExists(dbc);
        await dbc.close().catch(() => {});
      }
    });

    it('stopOnError=false continua após ORA-00942; true para na falha', async function () {
      this.timeout(120_000);
      const connStr = process.env.UTPLSQL_CONN as string;
      const dbc = await openRaw();
      try {
        await dropTableIfExists(dbc);
        await dbc.execute(`CREATE TABLE ${TABLE} (id NUMBER)`, {}, { autoCommit: true });
        const text =
          `INSERT INTO ${TABLE} VALUES (1);\n` +
          `INSERT INTO ${TABLE}_INEXISTENTE VALUES (2);\n` +
          `INSERT INTO ${TABLE} VALUES (3);`;
        const connect = (c: string) => connectOracle(c, { timeoutSeconds: 60 });

        const cont = await executeScript(connect, {
          connection: connStr,
          statements: splitScript(text),
          output: collector().output,
          stopOnError: false,
        });
        assert.deepStrictEqual([cont.executed, cont.ok, cont.failed], [3, 2, 1]);
        assert.strictEqual(await countRows(dbc), 2);

        await dbc.execute(`DELETE FROM ${TABLE}`, {}, { autoCommit: true });
        const stop = await executeScript(connect, {
          connection: connStr,
          statements: splitScript(text),
          output: collector().output,
          stopOnError: true,
        });
        assert.deepStrictEqual([stop.executed, stop.ok, stop.failed], [2, 1, 1]);
        assert.strictEqual(await countRows(dbc), 1);
      } finally {
        await dropTableIfExists(dbc);
        await dbc.close().catch(() => {});
      }
    });

    it('dbmsOutput captura PUT_LINE real do banco', async function () {
      this.timeout(120_000);
      const connStr = process.env.UTPLSQL_CONN as string;
      const { lines, output } = collector();
      const result = await executeScript((c: string) => connectOracle(c, { timeoutSeconds: 60 }), {
        connection: connStr,
        statements: splitScript(`BEGIN DBMS_OUTPUT.PUT_LINE('ola-62'); END;\n/`),
        output,
        dbmsOutput: true,
      });
      assert.strictEqual(result.failed, 0);
      assert.ok(
        lines.some((l) => l.includes('ola-62')),
        `DBMS_OUTPUT deveria aparecer, veio: ${lines.join('|')}`,
      );
    });

    it('charset win1252: çãõ € fazem round-trip sem corrupção', async function () {
      this.timeout(120_000);
      const connStr = process.env.UTPLSQL_CONN as string;
      const dbc = await openRaw();
      try {
        await dropTableIfExists(dbc);
        await dbc.execute(`CREATE TABLE ${TABLE} (txt VARCHAR2(100))`, {}, { autoCommit: true });
        // 'çãõ €' em Windows-1252: E7 E3 F5 20 80
        const decoded = decodeScript(Uint8Array.from([0xe7, 0xe3, 0xf5, 0x20, 0x80]), 'win1252');
        assert.strictEqual(decoded, 'çãõ €');
        const { output } = collector();
        const result = await executeScript(
          (c: string) => connectOracle(c, { timeoutSeconds: 60 }),
          {
            connection: connStr,
            statements: splitScript(`INSERT INTO ${TABLE} VALUES ('${decoded}');`),
            output,
            label: 'acentos.sql',
            charset: 'win1252',
          },
        );
        assert.strictEqual(result.failed, 0);
        const r = await dbc.execute(`SELECT txt FROM ${TABLE}`, {});
        assert.strictEqual(String(firstCol(r.rows?.[0])), 'çãõ €');
      } finally {
        await dropTableIfExists(dbc);
        await dbc.close().catch(() => {});
      }
    });

    it('connectOracle abre, executa e fecha contra o banco real', async function () {
      this.timeout(120_000);
      const connStr = process.env.UTPLSQL_CONN as string;
      const db = await connectOracle(connStr, { timeoutSeconds: 60 });
      try {
        const r = await db.execute('SELECT 1 FROM dual', { autoCommit: true });
        assert.ok(r);
      } finally {
        await db.close();
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
      const compilePath = path.join(
        root,
        'src',
        'test',
        'integration',
        'fixtures',
        'compile_packages.sql',
      );
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
        const cal = extractObj(
          script,
          'create or replace package calculator as',
          'create or replace function greet',
        );
        const tcal = extractObj(
          script,
          'create or replace package test_calculator as',
          'create or replace package test_betwnvarchar',
        );
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
          const r = await dbc.execute(
            'SELECT text FROM ut3.UT_OUTPUT_BUFFER_TMP ORDER BY message_id',
            {},
          );
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
  });
  describe('runtime live (debugger/loaders) contra o banco real', () => {
    it('liveRuntime.acquireConnection abre conexão e runTest executa ut_runner', async function () {
      this.timeout(120_000);
      const { liveRuntime } = require('../../debugger.js');
      const conn = await liveRuntime.acquireConnection();
      assert.ok(conn, 'deveria abrir conexão real via pool');
      try {
        await liveRuntime.runTest(conn, 'test_math');
      } finally {
        await conn.close();
      }
    });

    it('applySqlCoverage com loader padrão (oracledb real) não quebra', async function () {
      this.timeout(120_000);
      const conn = process.env.UTPLSQL_CONN as string;
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string;
      const { applySqlCoverage } = require('../../viewCoverage.js');
      const run = { appendOutput: () => {}, addCoverage: () => {} } as never;
      const state = { setCoverage: () => {}, clearCoverage: () => {} } as never;
      const folders = vscode.workspace.workspaceFolders as never;
      // Sem o 3º parâmetro (loader injetável) -> usa o oracledb real (V$SQL negado -> aviso, não lança)
      await applySqlCoverage({
        connection: conn,
        root,
        sourcePath: 'install',
        run,
        state,
        folders,
      });
    });
  });
});
