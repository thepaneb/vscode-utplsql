import './setup.js';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

const ROOT = path.resolve(__dirname, '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('matrix.env: cada versão tem label|imagem|service e label única', () => {
  const block = read('scripts/db-matrix/matrix.env').match(/VERSIONS="([^"]*)"/s);
  assert.ok(block, 'VERSIONS não encontrado no matrix.env');
  const entries = block[1]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  assert.ok(entries.length >= 4, `esperado >= 4 versões, achei ${entries.length}`);
  const labels = new Set<string>();
  for (const line of entries) {
    const parts = line.split('|');
    // label|imagem|service|[utplsql_version[|client]] — 4º/5º opcionais.
    assert.ok(
      parts.length === 3 || parts.length === 4 || parts.length === 5,
      `linha malformada (esperado 3, 4 ou 5 campos): ${line}`,
    );
    const [label, image, service] = parts;
    assert.ok(label && image && service, `campos vazios: ${line}`);
    assert.ok(!labels.has(label), `label duplicada: ${label}`);
    labels.add(label);
    if (parts[3]) {
      assert.match(parts[3], /^v?\d+\.\d+/, `versão do utPLSQL inválida: ${parts[3]}`);
    }
  }
});

test('matrix.env: 12.2 usa piso alternativo utPLSQL v3.1.x', () => {
  const block = read('scripts/db-matrix/matrix.env').match(/VERSIONS="([^"]*)"/s);
  assert.ok(block);
  const line122 = block[1].split('\n').find((l) => l.trim().startsWith('12.2|'));
  assert.ok(line122, 'entrada 12.2 ausente no matrix.env');
  const parts = line122.trim().split('|');
  assert.strictEqual(parts.length, 4, '12.2 deve declarar a versão do utPLSQL (4º campo)');
  assert.match(parts[3], /^v?3\.1\./, `12.2 deveria usar utPLSQL 3.1.x, veio: ${parts[3]}`);
  // O serviço do 12.2 tem DB_DOMAIN (orclpdb1.localdomain), não orclpdb1.
  assert.match(parts[2], /\.localdomain$/);
  // As demais versões são 18c+ e podem ficar sem o 4º campo (usam UTPLSQL_VERSION).
  const withoutVersion = block[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('12.2|') && l.split('|').length === 3);
  assert.ok(withoutVersion.length >= 4, 'demais versões devem usar o default UTPLSQL_VERSION');
});

test('matrix.env: 11xe é thick-only, usa XE e utPLSQL 3.1.x', () => {
  const block = read('scripts/db-matrix/matrix.env').match(/VERSIONS="([^"]*)"/s);
  assert.ok(block);
  const line11 = block[1].split('\n').find((l) => l.trim().startsWith('11xe|'));
  assert.ok(line11, 'entrada 11xe ausente no matrix.env');
  const parts = line11.trim().split('|');
  assert.strictEqual(parts.length, 5, '11xe deve declarar o 5º campo (client)');
  assert.match(parts[1], /gvenzl\/oracle-xe:11-slim@sha256:[0-9a-f]{64}$/);
  assert.strictEqual(parts[2], 'XE');
  assert.match(parts[3], /^v?3\.1\./);
  assert.strictEqual(parts[4], 'thick');
  assert.match(
    read('scripts/db-matrix/matrix.env'),
    /DB_DATA_DIR_11XE=.*\/u01\/app\/oracle\/oradata/,
  );
});

test('smoke inclui os testes de DBMS_DEBUG (package + function standalone)', () => {
  const smoke = read('.vscode-test.smoke.mjs');
  assert.match(smoke, /debuggerE2E\.test\.js/);
  assert.match(smoke, /debuggerStandaloneFn\.test\.js/);
});

test('smoke cobre as capacidades das PRDs 0.13 (get_suites_info/rebuild)', () => {
  const smoke = read('.vscode-test.smoke.mjs');
  assert.match(smoke, /oracleCapabilities\.test\.js/);
  const caps = read('src/test/integration/oracleCapabilities.test.ts');
  assert.match(caps, /get_suites_info/);
  assert.match(caps, /rebuildAnnotationCache/);
  assert.match(caps, /UTPLSQL_SUITES_INFO_MIN_VERSION/);
});

test('smoke cobre as features da versão corrente (v017)', () => {
  const smoke = read('.vscode-test.smoke.mjs');
  assert.match(smoke, /v017-features\.test\.js/);
});

test('integração 0.13 existe e é coberta pelo glob base do vscode-test', () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, 'src/test/integration/v013-features.test.ts')),
    'v013-features.test.ts deveria existir',
  );
  const base = read('.vscode-test.mjs');
  assert.match(base, /out\/test\/integration\/\*\*\/\*\.test\.js/);
});

test('bootstrap da matriz concede os grants de debugger ao schema de teste', () => {
  const bootstrap = read('scripts/db-matrix/bootstrap.sh');
  assert.match(bootstrap, /grant debug connect session to ut3/i);
  assert.match(bootstrap, /grant execute on sys\.dbms_debug to ut3/i);
  assert.match(bootstrap, /grant execute on sys\.dbms_debug to utplsql_test/i);
  assert.match(bootstrap, /grant debug connect session to utplsql_test/i);
});

test('scripts da matriz: sintaxe bash válida', (t) => {
  if (process.platform === 'win32') {
    t.skip('bash indisponível a partir do node Windows');
    return;
  }
  for (const s of ['run.sh', 'bootstrap.sh', 'wait-ready.sh']) {
    const r = spawnSync('bash', ['-n', path.join(ROOT, 'scripts', 'db-matrix', s)], {
      encoding: 'utf8',
    });
    assert.strictEqual(r.status, 0, `${s}: ${r.stderr}`);
  }
});

// ── parse-version.cjs (piso alternativo de utPLSQL por banco) ─────────

const { parseVersionLine } = require(
  path.join(ROOT, 'scripts', 'db-matrix', 'parse-version.cjs'),
) as { parseVersionLine: (line: string, def?: string) => Record<string, unknown> };

test('parse-version: linha com 4 campos usa a versão explícita', () => {
  const r = parseVersionLine(
    '12.2|container-registry.oracle.com/database/enterprise:12.2.0.1-slim|orclpdb1.localdomain|v3.1.14',
    'v.3.2.3',
  );
  assert.strictEqual(r.label, '12.2');
  assert.strictEqual(r.service, 'orclpdb1.localdomain');
  assert.strictEqual(r.utplsqlVersion, 'v3.1.14');
  assert.strictEqual(r.hasExplicitVersion, true);
});

test('parse-version: 5º campo client normaliza both/thick', () => {
  const thick = parseVersionLine('11xe|img|XE|v3.1.14|thick', 'v.3.2.3');
  assert.strictEqual(thick.client, 'thick');
  assert.strictEqual(thick.hasExplicitClient, true);
  const both = parseVersionLine('23free|img|FREEPDB1||BOTH', 'v.3.2.3');
  assert.strictEqual(both.client, 'both');
  const invalid = parseVersionLine('x|img|svc||qualquer', 'v.3.2.3');
  assert.strictEqual(invalid.client, 'both');
});

test('parse-version: run.sh aceita 5 campos, guarda thick e client por versão', () => {
  const run = read('scripts/db-matrix/run.sh');
  assert.match(run, /local_client/);
  assert.match(run, /só roda com --thick/);
  assert.match(run, /ORACLE_CLIENT_LIB_DIR_\$\{label_suffix\}/);
  assert.match(run, /DB_DATA_DIR_11XE/);
  assert.match(run, /thick-only/);
});

test('parse-version: linha com 3 campos cai no default', () => {
  const r = parseVersionLine('23free|image|FREEPDB1', 'v.3.2.3');
  assert.strictEqual(r.utplsqlVersion, 'v.3.2.3');
  assert.strictEqual(r.hasExplicitVersion, false);
});

test('parse-version: 4º campo vazio cai no default', () => {
  const r = parseVersionLine('18xe|image|XEPDB1|', 'v.3.2.3');
  assert.strictEqual(r.utplsqlVersion, 'v.3.2.3');
  assert.strictEqual(r.hasExplicitVersion, false);
});

test('parse-version: tolera espaços e linha vazia', () => {
  assert.strictEqual(parseVersionLine('  a | b | c | v3.1.1 ', '').utplsqlVersion, 'v3.1.1');
  const empty = parseVersionLine('', 'v.3.2.3');
  assert.strictEqual(empty.label, '');
  assert.strictEqual(empty.utplsqlVersion, 'v.3.2.3');
});

test('parse-version: run.sh usa parse-version.cjs para a versão por banco', () => {
  const run = read('scripts/db-matrix/run.sh');
  assert.match(run, /parse-version\.cjs/);
});

test('parse-version: run.sh usa default estável (o export do loop não vaza)', () => {
  const run = read('scripts/db-matrix/run.sh');
  // Base separada, capturada antes do loop.
  assert.match(run, /UTPLSQL_BASE_VERSION="\$UTPLSQL_VERSION"/);
  assert.match(run, /local_utplsql_version="\$UTPLSQL_BASE_VERSION"/);
  // O default passado ao parser é a base, nunca o UTPLSQL_VERSION reexportado
  // por banco (senão o 12.2/v3.1.x viraria default de todos os seguintes).
  assert.match(run, /parse-version\.cjs"\)"\s+"\$__line"\s+"\$UTPLSQL_BASE_VERSION"/);
  assert.doesNotMatch(run, /parse-version\.cjs"\)"\s+"\$__line"\s+"\$UTPLSQL_VERSION"/);
  // O export por banco continua, pois o bootstrap o consome.
  assert.match(run, /export[^\n]*UTPLSQL_VERSION="\$local_utplsql_version"/);
});

test('parse-version.cjs: CLI --field devolve o campo pedido', () => {
  const r = spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'scripts/db-matrix/parse-version.cjs'),
      '--field',
      '3',
      '12.2|img|svc|v3.1.14',
      'v.3.2.3',
    ],
    { encoding: 'utf8' },
  );
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, 'v3.1.14');
});

test('parse-version.cjs: CLI --field 4 devolve o client', () => {
  const r = spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'scripts/db-matrix/parse-version.cjs'),
      '--field',
      '4',
      '11xe|img|XE|v3.1.14|thick',
      'v.3.2.3',
    ],
    { encoding: 'utf8' },
  );
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, 'thick');
});

test('run.sh: --list anota 11xe como thick-only sem subir banco', (t) => {
  if (process.platform === 'win32') {
    t.skip('bash/run.sh não é executável a partir do node Windows');
    return;
  }
  const r = spawnSync('bash', [path.join(ROOT, 'scripts/db-matrix/run.sh'), '--list'], {
    encoding: 'utf8',
    cwd: ROOT,
    env: { ...process.env, ORACLE_AUTH_USER: 'skip', ORACLE_AUTH_TOKEN: '' },
  });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /11xe\|.*\(thick-only\)/);
});

test('run.sh: --only 11xe sem --thick falha antes do Docker', (t) => {
  if (process.platform === 'win32') {
    t.skip('bash/run.sh não é executável a partir do node Windows');
    return;
  }
  const r = spawnSync('bash', [path.join(ROOT, 'scripts/db-matrix/run.sh'), '--only', '11xe'], {
    encoding: 'utf8',
    cwd: ROOT,
    env: { ...process.env, ORACLE_AUTH_USER: 'skip', ORACLE_AUTH_TOKEN: '' },
  });
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /11xe só roda com --thick/);
});

test('parse-version.cjs: CLI --field fora do intervalo devolve vazio', () => {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts/db-matrix/parse-version.cjs'), '--field', '9', 'a|b|c', 'v.3.2.3'],
    { encoding: 'utf8' },
  );
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
});

test('run.sh: limpa o container em falha/interrupção e preserva o volume', () => {
  const run = read('scripts/db-matrix/run.sh');
  assert.match(run, /trap cleanup EXIT INT TERM/);
  assert.match(run, /compose down --remove-orphans/);
  // `--keep-db` desliga o cleanup; o volume nomeado nunca é removido no down.
  assert.match(run, /KEEP_DB:-0/);
  assert.doesNotMatch(run, /compose down[^\n]*-v/);
});

test('run.sh: --skip-bootstrap valida UT3/UTPLSQL_TEST antes dos testes', () => {
  const run = read('scripts/db-matrix/run.sh');
  assert.match(run, /assert_bootstrapped/);
  assert.match(run, /UT_RUNNER/);
  assert.match(run, /UTPLSQL_TEST/);
  assert.match(run, /SKIP_BOOTSTRAP.*assert_bootstrapped/s);
});

test('run.sh: falha de bootstrap não sai silenciosamente (diagnóstico sem senha)', () => {
  const run = read('scripts/db-matrix/run.sh');
  // As duas checagens do --skip-bootstrap precisam de `|| true`: sem isso o
  // `set -e` mata o script antes de imprimir o diagnóstico (bug real no 12.2).
  const guarded = run.match(/\)" \|\| true/g) ?? [];
  assert.ok(guarded.length >= 2, 'as checagens de UT3/UTPLSQL_TEST devem usar || true');
  assert.match(run, /UT3: \$\(grep -m1 -E 'ORA-\|SP2-'/);
  assert.match(run, /UTPLSQL_TEST: \$\(grep -m1 -E 'ORA-\|SP2-'/);
});

test('run.sh: mascara a senha da conexão no log', () => {
  const run = read('scripts/db-matrix/run.sh');
  assert.match(run, /mask_conn\(\)/);
  assert.match(run, /UTPLSQL_CONN=\$\(mask_conn "\$UTPLSQL_CONN"\)/);
  assert.doesNotMatch(run, /UTPLSQL_CONN=\$UTPLSQL_CONN/);
});

test('run.sh: modos --full, --continue-on-error e resumo da matriz', () => {
  const run = read('scripts/db-matrix/run.sh');
  assert.match(run, /--full\)/);
  assert.match(run, /test:integration:multiroot/);
  assert.match(run, /--continue-on-error\)/);
  assert.match(run, /summary\.cjs"\)"\s+append/);
  assert.match(run, /summary\.cjs"\)"\s+render/);
  assert.match(run, /matrix-summary-/);
  // Sem `node` no PATH (WSL), o resumo é opcional e não derruba a matriz.
  assert.match(run, /NODE_BIN=/);
  assert.match(run, /node_path\(\)/);
  assert.match(run, /wslpath -w/);
  assert.match(run, /node_path "\$SUMMARY_FILE"/);
  assert.match(run, /node não encontrado: resumo/);
});

test('workflow da matriz roda multi-root e publica o resumo', () => {
  const workflow = read('.github/workflows/integration.yml');
  assert.match(workflow, /test:integration:multiroot/);
  assert.match(workflow, /upload-artifact/);
  assert.match(workflow, /matrix-summary/);
});

test('workflow da matriz separa os schedules e expõe matrix-smoke (PRD-125)', () => {
  const workflow = read('.github/workflows/integration.yml');
  // Nightly (0 3) e semanal (0 4 dom) usam o mesmo ref (main): sem o cron no
  // grupo, o cancel-in-progress de um derruba o outro quando o scheduler atrasa.
  assert.match(
    workflow,
    /group: integration-\$\{\{ github\.ref \}\}-\$\{\{ github\.event\.schedule \|\| github\.event_name \}\}/,
  );
  // Dispatch dedicado para validar 18c/21c em smoke antes de confiar no semanal.
  assert.match(workflow, /matrix-smoke/);
  assert.match(workflow, /--only 18xe,21xe --smoke/);
});

test('parse-version.cjs: CLI sem --field devolve JSON', () => {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts/db-matrix/parse-version.cjs'), '23free|img|FREEPDB1', 'v.3.2.3'],
    { encoding: 'utf8' },
  );
  assert.strictEqual(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.strictEqual(parsed.label, '23free');
  assert.strictEqual(parsed.utplsqlVersion, 'v.3.2.3');
  assert.strictEqual(parsed.hasExplicitVersion, false);
});

test('thick-full: run.sh aceita o eixo e o config exclui os testes thin-only', () => {
  const run = read('scripts/db-matrix/run.sh');
  assert.match(run, /--thick-full/);
  assert.match(run, /test:integration:thick-full/);
  assert.match(run, /só roda com --thick/);
  const cfg = read('.vscode-test.thick-full.mjs');
  assert.match(cfg, /prd70-sqlplus/);
  assert.match(cfg, /v014-tns/);
  assert.match(cfg, /thickMode/);
  assert.match(cfg, /utplsql\.oracleClientMode/);
  assert.match(cfg, /utplsql\.oracleClientLibDir/);
  assert.match(cfg, /UTPLSQL_THICK_CONN/);
});
