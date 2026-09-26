/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { splitPassword } from '../../connectionProfiles';
import type { ConnectionProfile } from '../../types';
import { installOutFormatIsolation } from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// E2E do SecretStorage de perfis (PRD-65 RF3) — de verdade, no Extension Host.
//
// Por que este arquivo existe e por que ele NÃO é tautológico:
//
//   * As suítes unitárias injetam um `SecretStorage` stub, portanto provam a
//     *lógica* (`saveProfiles` → `splitPassword` → cache), mas nunca tocam o
//     `context.secrets` real do VSCode.
//   * Aqui o comando é executado de verdade (`utplsql.importSqlDevConnections`)
//     dentro do Extension Host, o que obriga o módulo BUNDLED
//     (dist/extension.js) a usar o `context.secrets` real do `paneb.vscode-utplsql`.
//   * O efeito observável é público: (1) `utplsql.profiles` (Global) não pode
//     conter a senha; (2) o perfil importado, com a senha só no SecretStorage,
//     tem de conseguir CONECTAR — o que exige que a senha chegue à string
//     efetiva por um canal fora das settings.
//
// O que este teste PROVA (e o que NÃO prova):
//     PROVA  — (a) o perfil importado fica em `utplsql.profiles` sem a senha
//     (`user@host:port/service`); (b) `saveProfiles` do módulo BUNDLED completou
//     usando o `context.secrets` real — `persistPassword` faz `await
//     secretStorage.store(...)` ANTES do `config.update('profiles')`, então a
//     própria escrita da setting já prova que o `store()` resolveu; (c) a string
//     de conexão recomposta a partir do perfil conecta no Oracle.
//     NÃO PROVA — que a senha seja lida de volta do disco. O `passwordCache` em
//     memória é aquecido por `rememberPassword` na MESMA chamada de `saveProfiles`
//     que escreve a setting, tudo no mesmo host. Provar o round-trip do
//     SecretStorage exigiria um segundo host (recarregar a janela), o que o
//     runner de integração não faz — por isso o nome do teste fala em
//     "saveProfiles completou com o context.secrets real" e não em reidratação.
//
// Controle negativo (impede o teste de passar "de graça"):
//   o mesmo `connections.xml` semeia um segundo perfil com um usuário INEXISTENTE
//   (nunca o usuário real com senha errada — tentativas repetidas podem bloquear
//   a conta no banco). Com ele ativo, `utplsql.validateSetup` TEM de publicar
//   `UTPLSQL_BAD_CONN`; com o perfil bom ativo, o código TEM de sumir. Essa
//   transição em duas direções prova que o canal de diagnósticos está vivo e
//   sendo observado — se `languages.getDiagnostics` não enxergasse a coleção,
//   o controle falharia em vez de o teste passar em silêncio.
//
// Segurança: este teste grava a senha real de `UTPLSQL_CONN` no SecretStorage, e
// ela FICA SÓ no user-data-dir descartável do runner. O `@vscode/test-electron`
// sobe o VSCode com `--user-data-dir=.vscode-test/user-data` e
// `--extensions-dir=.vscode-test/extensions` (ver `getProfileArguments` em
// @vscode/test-electron/out/util.js): diretórios de cache descartáveis e
// gitignored, que o runner pode apagar sem perder nada. SecretStorage e
// `settings.json` Global vivem NESSA pasta — nunca no perfil real do VSCode do
// desenvolvedor. O teste ainda assim não depende disso para não vazar: ele não
// exporta, lê nem imprime o valor do segredo (não existe API pública para
// acessá-lo de fora da extensão, e forçar uma burlaria justamente o que se quer
// provar — nenhuma mensagem de asserção embute a senha). Além disso, o
// connections.xml plantado é apagado e APPDATA/HOME e as settings globais são
// restaurados no hook `after`.
//
// Gate: `UTPLSQL_CONN` no `.env` (mesma regra dos demais testes de integração).
// ─────────────────────────────────────────────────────────────────────────────

const EXT_ID = 'paneb.vscode-utplsql';
const GOOD_PROFILE_NAME = 'utplsql-it-sqldev-secretstorage';
const BAD_PROFILE_NAME = 'utplsql-it-sqldev-missinguser';
const MISSING_USER = 'UTPLSQL_NO_SUCH_USER_E2E';
const SETUP_DIAG_URI = 'utplsql-setup:diagnostics';
const BAD_CONN = 'UTPLSQL_BAD_CONN';
/** Caracteres que o XML exige escapar e que `parseSqlDevConnections` NÃO desescapa. */
const NEEDS_XML_ESCAPE = /[&<>"']/;

interface ConnParts {
  user: string;
  password: string;
  host: string;
  port: string;
  service: string;
}

/**
 * Quebra `user/pass@//host:port/service` (aceita também `host:port/service`,
 * `host:port/sid`, `host/service` e `//host/service`) nos campos que o
 * `connections.xml` do SQL Developer sabe expressar. Mesma estratégia de corte
 * de `parseConnString`/`splitPassword`: último `@`, primeiro `/` das credenciais.
 * Lança (em vez de devolver lixo) quando o formato não é suportado.
 */
function parseConn(conn: string): ConnParts {
  const at = conn.lastIndexOf('@');
  const cred = at > 0 ? conn.slice(0, at) : '';
  const slash = cred.indexOf('/');
  assert.ok(at > 0 && slash > 0, 'UTPLSQL_CONN deve ser user/senha@//host:porta/serviço');
  const user = cred.slice(0, slash);
  const password = cred.slice(slash + 1);
  assert.ok(user.length > 0, 'UTPLSQL_CONN sem usuário');
  assert.ok(password.length > 0, 'UTPLSQL_CONN sem senha');

  const rest = conn.slice(at + 1).replace(/^\/\//, '');
  const m = rest.match(/^([^:/]+)(?::(\d+))?(?:\/(.+))?$/);
  assert.ok(m, `connect string não é host[:porta]/serviço: ${rest}`);
  const service = m[3] ?? '';
  assert.ok(service.length > 0, `UTPLSQL_CONN sem serviço/sid: ${rest}`);
  return { user, password, host: m[1] as string, port: m[2] ?? '1521', service };
}

function connParts(): ConnParts {
  return parseConn((process.env.UTPLSQL_CONN as string).trim());
}

/** Variante silenciosa, para decidir o gate do `describe` no load do módulo. */
function connPartsOrUndefined(): ConnParts | undefined {
  try {
    return connParts();
  } catch {
    return undefined;
  }
}

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}

const PARTS = connPartsOrUndefined();
const describeDB = hasConnection() ? describe : describe.skip;
// Gate: sem `UTPLSQL_CONN`, ou com uma conexão que não sai de
// `parseConn`, a suíte inteira nem é registrada. Assim uma conn malformada
// nunca entra e não pode contaminar o `before` com `assert` explodindo.
const describeIt = PARTS ? describeDB : describe.skip;

/** Escapa para atributo XML. */
function xml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function reference(name: string, password: string, p: ConnParts): string {
  return [
    '  <Reference class="oracle.jdbc.connection.OracleConnection"',
    `             name="${xml(name)}" userName="${xml(p.user)}" password="${xml(password)}">`,
    `    <StringRefAddr addrType="hostname">${xml(p.host)}</StringRefAddr>`,
    `    <StringRefAddr addrType="port">${xml(p.port)}</StringRefAddr>`,
    `    <StringRefAddr addrType="serviceName">${xml(p.service)}</StringRefAddr>`,
    '  </Reference>',
  ].join('\n');
}

function connectionsXml(p: ConnParts): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Connections>',
    // Perfil bom: credenciais derivadas exatamente de UTPLSQL_CONN.
    reference(GOOD_PROFILE_NAME, p.password, p),
    // Controle negativo: usuário inexistente. Não usar o usuário real com senha
    // errada — repetições de login podem bloquear a conta (ORA-28000).
    reference(BAD_PROFILE_NAME, p.password, { ...p, user: MISSING_USER }),
    '</Connections>',
    '',
  ].join('\n');
}

function globalProfiles(): ConnectionProfile[] {
  return (
    vscode.workspace.getConfiguration('utplsql').inspect<ConnectionProfile[]>('profiles')
      ?.globalValue ?? []
  );
}

/**
 * `parseSqlDevConnections` devolve o texto do atributo cru, sem resolver
 * entidades XML. Com `& < > " '` na senha, o valor importado NÃO é comparável
 * byte a byte com `UTPLSQL_CONN` — e a comparação passaria por vacuidade. Os
 * testes que comparam valor a valor pulam explicitamente nesse caso, em vez de
 * a limitação virar um "verde" falso.
 */
function needsXmlEscape(): boolean {
  return !!PARTS && (NEEDS_XML_ESCAPE.test(PARTS.user) || NEEDS_XML_ESCAPE.test(PARTS.password));
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface DiagSnapshot {
  codes: string[];
  badConn: number;
}

/**
 * Lê a coleção `utplsql-setup` publicada pelo `SetupValidator` do módulo BUNDLED.
 * `applyDiagnostics` roda dentro do Extension Host e `languages.getDiagnostics` é
 * uma ida-e-volta ao main thread, então a leitura pode laggingar em relação ao
 * `executeCommand` já resolvido — por isso o polling em vez de leitura única.
 */
async function readSetupDiagnostics(): Promise<DiagSnapshot> {
  const diags = await vscode.languages.getDiagnostics(vscode.Uri.parse(SETUP_DIAG_URI));
  const codes = diags.map((d) => String(d.code));
  return { codes, badConn: codes.filter((c) => c === BAD_CONN).length };
}

function hasBadConn(snap: DiagSnapshot): boolean {
  return snap.badConn > 0;
}

/** Polla até `UTPLSQL_BAD_CONN` aparecer (`present: true`) ou sumir (`false`). */
async function waitForBadConn(present: boolean, timeoutMs: number): Promise<DiagSnapshot> {
  const deadline = Date.now() + timeoutMs;
  let snap = await readSetupDiagnostics();
  while (hasBadConn(snap) !== present) {
    if (Date.now() > deadline) return snap;
    await delay(250);
    snap = await readSetupDiagnostics();
  }
  return snap;
}

/** Janela de estabilidade e teto do poll de quiescência (nunca infinito). */
const QUIESCE_STABLE_MS = 500;
const QUIESCE_MAX_MS = 15_000;

/**
 * Aguarda a coleção `utplsql-setup` parar de mudar. `activate()` dispara
 * `validateOnActivation()` + `applyDiagnostics()` num bloco `void` sem await
 * (extension.ts), e `applyDiagnostics` faz `clear()` antes de repopular: se essa
 * publicação atrasada cair DEPOIS do nosso import/validate, ela apaga a
 * evidência que acabamos de produzir e o teste passa a medir lixo.
 *
 * Considera quiescente quando duas leituras consecutivas, separadas por
 * `QUIESCE_STABLE_MS`, dão o mesmo conjunto de códigos. Teto de
 * `QUIESCE_MAX_MS`: se a coleção ficar mudando, retorna assim mesmo (depois
 * chamamos `validateSetup`, que republica a coleção inteira).
 */
async function waitForDiagnosticsQuiescence(): Promise<DiagSnapshot> {
  const deadline = Date.now() + QUIESCE_MAX_MS;
  let prev = await readSetupDiagnostics();
  for (;;) {
    await delay(QUIESCE_STABLE_MS);
    const next = await readSetupDiagnostics();
    if (next.codes.join('|') === prev.codes.join('|')) return next;
    prev = next;
    if (Date.now() > deadline) return next;
  }
}

describeIt(
  'E2E SecretStorage de perfis — import do SQL Developer usa o context.secrets real',
  () => {
    installOutFormatIsolation();

    let tmpRoot: string;
    let appdataBackup: string | undefined;
    let homeBackup: string | undefined;
    let userProfileBackup: string | undefined;
    let profilesBackup: ConnectionProfile[] | undefined;
    let activeBackup: string | undefined;
    let goodProfileId: string;
    let badProfileId: string;

    before(async () => {
      const p = connParts();
      const ext = vscode.extensions.getExtension(EXT_ID);
      assert.ok(ext, `extensão ${EXT_ID} não encontrada`);
      await ext.activate();

      // A ativação publica diagnósticos num bloco `void` sem await. Deixar que
      // ele ainda esteja em voo faria o `clear()` dele derrubar a evidência que
      // os testes daqui em frente produzem — por isso a quiescência primeiro.
      const activationDiags = await waitForDiagnosticsQuiescence();
      assert.ok(
        !hasBadConn(activationDiags),
        [
          'a ativação já publicou UTPLSQL_BAD_CONN — a suíte mediria um estado',
          'herdado em vez do efeito do perfil importado.',
          `codes=[${activationDiags.codes.join(',')}]`,
        ].join(' '),
      );

      // Snapshot do ambiente + redirecionamento do APPDATA. O HOME também é
      // redirecionado porque `importFromSqlDeveloper` sonda `~/.sqldeveloper`
      // ANTES de `%APPDATA%/SQL Developer`: sem isso, uma instalação real do SQL
      // Developer na máquina do dev seria lida no lugar do XML plantado e o perfil
      // com o nome esperado nunca apareceria.
      appdataBackup = process.env.APPDATA;
      homeBackup = process.env.HOME;
      userProfileBackup = process.env.USERPROFILE;

      tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-sqldev-e2e-'));
      const connDir = path.join(
        tmpRoot,
        'SQL Developer',
        'systemE2E',
        'o.jdeveloper.db.connection',
      );
      fs.mkdirSync(connDir, { recursive: true });
      fs.writeFileSync(path.join(connDir, 'connections.xml'), connectionsXml(p), 'utf-8');

      process.env.APPDATA = tmpRoot;
      process.env.HOME = tmpRoot;
      process.env.USERPROFILE = tmpRoot;

      // Snapshot das settings globais sobrescritas por este teste.
      const cfg = vscode.workspace.getConfiguration('utplsql');
      profilesBackup = cfg.inspect<ConnectionProfile[]>('profiles')?.globalValue;
      activeBackup = cfg.inspect<string>('activeProfile')?.globalValue;

      // Comando REAL do módulo BUNDLED: é ele que grava a senha no
      // `context.secrets` real (via `initSecretStorage` na ativação).
      await vscode.commands.executeCommand('utplsql.importSqlDevConnections');

      const imported = globalProfiles();
      const good = imported.find((x) => x.name === GOOD_PROFILE_NAME);
      const bad = imported.find((x) => x.name === BAD_PROFILE_NAME);
      assert.ok(
        good,
        `perfil "${GOOD_PROFILE_NAME}" não importado de ${connDir}. perfis=[${imported
          .map((x) => x.name)
          .join(', ')}]`,
      );
      assert.ok(
        bad,
        `perfil de controle "${BAD_PROFILE_NAME}" não importado. perfis=[${imported
          .map((x) => x.name)
          .join(', ')}]`,
      );
      goodProfileId = good.id;
      badProfileId = bad.id;
    });

    after(async () => {
      const cfg = vscode.workspace.getConfiguration('utplsql');
      try {
        await cfg.update(
          'activeProfile',
          activeBackup !== undefined ? activeBackup : undefined,
          vscode.ConfigurationTarget.Global,
        );
        await cfg.update(
          'profiles',
          profilesBackup !== undefined ? profilesBackup : undefined,
          vscode.ConfigurationTarget.Global,
        );
      } catch {
        /* mesmo falhando a settings, a limpeza do disco tem de acontecer */
      }
      if (appdataBackup === undefined) delete process.env.APPDATA;
      else process.env.APPDATA = appdataBackup;
      if (homeBackup === undefined) delete process.env.HOME;
      else process.env.HOME = homeBackup;
      if (userProfileBackup === undefined) delete process.env.USERPROFILE;
      else process.env.USERPROFILE = userProfileBackup;
      if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
    });

    it('importa o perfil com user/host/port/service derivados de UTPLSQL_CONN', function () {
      if (needsXmlEscape()) this.skip();
      const p = connParts();
      const good = globalProfiles().find((x) => x.id === goodProfileId);
      assert.ok(good, 'perfil importado sumiu de utplsql.profiles Global');
      assert.strictEqual(
        good.connection,
        `${p.user}@${p.host}:${p.port}/${p.service}`,
        'connection deveria ser user@host:port/service (senha fora da setting)',
      );
    });

    it('utplsql.profiles Global não guarda a senha e splitPassword devolve vazio', function () {
      if (needsXmlEscape()) this.skip();
      const p = connParts();
      const good = globalProfiles().find((x) => x.id === goodProfileId);
      assert.ok(good, 'perfil importado sumiu de utplsql.profiles Global');

      assert.ok(
        !good.connection.includes(`/${p.password}`),
        'utplsql.profiles não pode conter a senha em texto puro',
      );
      assert.ok(
        !good.connection.includes('/password@'),
        'connection não pode conter o marcador /password@',
      );

      // A função pura que decide o que é despachado para o SecretStorage tem de
      // concordar com o que foi persistido.
      const split = splitPassword(good.connection);
      assert.strictEqual(
        split.password,
        '',
        'splitPassword deveria devolver senha vazia para o perfil já sanitizado',
      );
      assert.strictEqual(split.connection, good.connection);
    });

    // Sequência good → bad → good. O `utplsql.validateSetup` sempre chama
    // `applyDiagnostics`, que faz `diagnosticCollection.clear()` antes de
    // repopular — cada passo abaixo usa a coleção inteira, sem herdar estado de
    // passos anteriores. A inversão bad → good é o que torna o teste não
    // tautológico: vemos o UTPLSQL_BAD_CONN *aparecer* e depois *sumir* no mesmo
    // canal, apenas por efeito da troca de perfil ativo.
    it('perfil importado: senha fora das settings, saveProfiles completou com o context.secrets real e a conexão recomposta conecta', async function () {
      this.timeout(180_000);
      const cfg = vscode.workspace.getConfiguration('utplsql');
      await cfg.update('activeProfile', goodProfileId, vscode.ConfigurationTarget.Global);
      await vscode.commands.executeCommand('utplsql.validateSetup');

      // A conexão recomposta (settings sem senha + segredo) tem de conectar; se
      // a senha não chegasse ao canal de fato, cairia em ORA-01017 e o
      // UTPLSQL_BAD_CONN apareceria.
      const goodRun = await waitForBadConn(false, 20_000);
      assert.ok(
        !hasBadConn(goodRun),
        [
          'o perfil importado (senha fora das settings) deveria conectar.',
          `codes=[${goodRun.codes.join(',')}]`,
        ].join(' '),
      );
    });

    it('controle negativo: usuário inexistente publica UTPLSQL_BAD_CONN', async function () {
      this.timeout(180_000);
      // Se este passo NÃO acusar, a ausência de erro no passo anterior não prova
      // nada — pode ser que a coleção não esteja sendo observada por
      // `languages.getDiagnostics` nesta URI.
      const cfg = vscode.workspace.getConfiguration('utplsql');
      await cfg.update('activeProfile', badProfileId, vscode.ConfigurationTarget.Global);
      await vscode.commands.executeCommand('utplsql.validateSetup');

      const badRun = await waitForBadConn(true, 90_000);
      assert.ok(
        hasBadConn(badRun),
        [
          'controle negativo não publicou UTPLSQL_BAD_CONN — sem ele a ausência de',
          'erro no perfil bom não provaria nada (a coleção de diagnósticos não está',
          `sendo observada?). codes=[${badRun.codes.join(',')}]`,
        ].join(' '),
      );
    });

    it('voltar ao perfil bom faz o UTPLSQL_BAD_CONN sumir (o canal reflete o perfil)', async function () {
      this.timeout(180_000);
      // Fecha o ciclo: a mesma URI que acusou o usuário inexistente agora fica
      // limpa. É a prova de que o "sem UTPLSQL_BAD_CONN" do primeiro passo veio
      // do perfil importado, e não de um canal inerte.
      const dirty = await readSetupDiagnostics();
      assert.ok(
        hasBadConn(dirty),
        `esperava o UTPLSQL_BAD_CONN do controle negativo; codes=[${dirty.codes.join(',')}]`,
      );

      const cfg = vscode.workspace.getConfiguration('utplsql');
      await cfg.update('activeProfile', goodProfileId, vscode.ConfigurationTarget.Global);
      await vscode.commands.executeCommand('utplsql.validateSetup');

      const back = await waitForBadConn(false, 20_000);
      assert.ok(
        !hasBadConn(back),
        [
          'voltando ao perfil bom o diagnóstico deveria sumir.',
          `codes=[${back.codes.join(',')}]`,
        ].join(' '),
      );
    });
  },
);
