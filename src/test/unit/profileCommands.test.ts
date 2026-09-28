import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mock, test } from 'node:test';
import type { CommandDeps } from '../../commands/deps';
import {
  __getInformationMessages,
  __getWarningMessages,
  __resetConfigValues,
  __resetInputBoxResults,
  __resetMessages,
  __setConfigValue,
  __setInputBoxResults,
  __setQuickPickResult,
  commands,
  workspace,
} from '../vscode-stub';

// Cobre `commands/profile.ts` isolando o `node:os` para que a descoberta do
// connections.xml do SQL Developer seja determinística (home controlada).

const emptyHome = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-empty-home-'));
const sqlDevHome = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-sqldev-home-'));
{
  const dir = path.join(sqlDevHome, '.sqldeveloper', 'system19.4.0', 'o.jdeveloper.db.connection');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'connections.xml'),
    `<Reference name="DEV" userName="scott" password="tiger">
       <StringRefAddr addrType="hostname">localhost</StringRefAddr>
       <StringRefAddr addrType="port">1521</StringRefAddr>
       <StringRefAddr addrType="serviceName">XE</StringRefAddr>
     </Reference>`,
  );
}

let fakeHome = emptyHome;
// Só `homedir` é usado por connectionProfiles; espalhar o módulo real tenta
// redefinir `constants` (não-configurável) e o mock do Node falha.
mock.module('node:os', { namedExports: { homedir: () => fakeHome } });

let idleCount = 0;

function makeDeps(): CommandDeps {
  return {
    controller: {} as never,
    state: {} as never,
    getStatusBar: () => ({ showIdle: () => (idleCount += 1) }) as never,
    getDecorationManager: () => undefined,
    refresh: async () => {},
  };
}

async function register() {
  commands.__resetRegisteredCommands();
  __resetMessages();
  commands.__resetExecutedCommands();
  __resetInputBoxResults();
  __resetConfigValues();
  idleCount = 0;
  __setQuickPickResult(undefined);
  const { registerProfileCommands } = await import('../../commands/profile.js');
  registerProfileCommands({ subscriptions: [] } as never, makeDeps());
}

function profilesSetting(): Array<Record<string, unknown>> {
  return workspace.getConfiguration('utplsql').get('profiles', []) as Array<
    Record<string, unknown>
  >;
}

test('switchProfile: sem perfis mostra informação', async () => {
  await register();
  await commands.__getRegisteredCommand('utplsql.switchProfile')?.();
  assert.deepStrictEqual(__getInformationMessages(), [
    'Nenhum perfil de conexão salvo. Use "utPLSQL: Novo perfil de conexão...".',
  ]);
});

test('switchProfile: seleção cancelada não ativa perfil', async () => {
  await register();
  __setConfigValue('profiles', [{ id: 'a', name: 'A', connection: 'u@//h:1521/s' }]);
  __setQuickPickResult(undefined);
  await commands.__getRegisteredCommand('utplsql.switchProfile')?.();
  assert.strictEqual(workspace.getConfiguration('utplsql').get('activeProfile'), undefined);
  assert.strictEqual(idleCount, 0);
});

test('switchProfile: perfil selecionado é ativado e a status bar volta a idle', async () => {
  await register();
  __setConfigValue('profiles', [{ id: 'a', name: 'A', connection: 'u@//h:1521/s' }]);
  __setQuickPickResult({ profile: { id: 'a', name: 'A', connection: 'u@//h:1521/s' } });
  await commands.__getRegisteredCommand('utplsql.switchProfile')?.();
  assert.strictEqual(workspace.getConfiguration('utplsql').get('activeProfile'), 'a');
  assert.strictEqual(idleCount, 1);
  assert.deepStrictEqual(__getInformationMessages(), ['Perfil ativo: A']);
});

test('manageProfiles: abre as settings de perfis', async () => {
  await register();
  await commands.__getRegisteredCommand('utplsql.manageProfiles')?.();
  assert.ok(commands.__getExecutedCommands().includes('workbench.action.openSettings'));
});

test('importSqlDevConnections: sem connections.xml avisa', async () => {
  await register();
  fakeHome = emptyHome;
  await commands.__getRegisteredCommand('utplsql.importSqlDevConnections')?.();
  assert.deepStrictEqual(__getWarningMessages(), [
    'Nenhuma conexão do SQL Developer encontrada (connections.xml).',
  ]);
});

test('importSqlDevConnections: importa e salva o perfil mesclado', async () => {
  await register();
  fakeHome = sqlDevHome;
  await commands.__getRegisteredCommand('utplsql.importSqlDevConnections')?.();
  assert.deepStrictEqual(__getInformationMessages(), [
    '1 conexão(ões) importada(s) do SQL Developer.',
  ]);
  const saved = profilesSetting();
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].name, 'DEV');
  // A senha sai do texto plano da setting.
  assert.strictEqual(saved[0].connection, 'scott@localhost:1521/XE');
});

test('newProfile: nome vazio cancela sem salvar', async () => {
  await register();
  __setInputBoxResults(['']);
  await commands.__getRegisteredCommand('utplsql.newProfile')?.();
  assert.deepStrictEqual(profilesSetting(), []);
});

test('newProfile: conexão vazia cancela sem salvar', async () => {
  await register();
  __setInputBoxResults(['MeuPerfil', '']);
  await commands.__getRegisteredCommand('utplsql.newProfile')?.();
  assert.deepStrictEqual(profilesSetting(), []);
});

test('newProfile: cria, salva sem senha e ativa o perfil', async () => {
  await register();
  __setInputBoxResults(['MeuPerfil', 'u/p@//h:1521/s', '', '']);
  await commands.__getRegisteredCommand('utplsql.newProfile')?.();
  const saved = profilesSetting();
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].name, 'MeuPerfil');
  assert.strictEqual(saved[0].connection, 'u@//h:1521/s');
  assert.strictEqual(workspace.getConfiguration('utplsql').get('activeProfile'), saved[0].id);
  assert.strictEqual(idleCount, 1);
  assert.deepStrictEqual(__getInformationMessages(), ['Perfil "MeuPerfil" criado e ativado.']);
});

test('newProfile: charset escolhido é gravado quando difere de utf8', async () => {
  await register();
  __setInputBoxResults(['MeuPerfil', 'u/p@//h:1521/s', '', '']);
  __setQuickPickResult({ label: 'latin1' });
  await commands.__getRegisteredCommand('utplsql.newProfile')?.();
  assert.strictEqual(profilesSetting()[0].charset, 'latin1');
});

test('newProfile: charset utf8 não é gravado', async () => {
  await register();
  __setInputBoxResults(['MeuPerfil', 'u/p@//h:1521/s', '', '']);
  __setQuickPickResult({ label: 'utf8' });
  await commands.__getRegisteredCommand('utplsql.newProfile')?.();
  assert.strictEqual(profilesSetting()[0].charset, undefined);
});

// ── setWalletPassword (PRD-82 RF4) ───────────────────────────────────
// `connectionProfiles` é importado dinamicamente para pegar o mock de `node:os`.

async function walletModule() {
  return import('../../connectionProfiles.js');
}

function fakeSecrets() {
  const map = new Map<string, string>();
  return {
    map,
    storage: {
      store: async (k: string, v: string) => {
        map.set(k, v);
      },
      get: async (k: string) => map.get(k),
      delete: async (k: string) => {
        map.delete(k);
      },
      onDidChange: () => ({ dispose() {} }),
    } as never,
  };
}

test('setWalletPassword: sem perfil ativo avisa', async () => {
  const { initSecretStorage } = await walletModule();
  await register();
  initSecretStorage(fakeSecrets().storage);
  __setConfigValue('profiles', []);
  __setConfigValue('activeProfile', '');
  await commands.__getRegisteredCommand('utplsql.setWalletPassword')?.();
  assert.ok(__getWarningMessages().length >= 1);
});

test('setWalletPassword: salva a senha da wallet no perfil ativo', async () => {
  const { getWalletPassword, initSecretStorage } = await walletModule();
  await register();
  const { map, storage } = fakeSecrets();
  initSecretStorage(storage);
  __setConfigValue('profiles', [{ id: 'w1', name: 'DEV', connection: 'u@//h:1521/s' }]);
  __setConfigValue('activeProfile', 'w1');
  __setInputBoxResults(['wallet-pass']);

  await commands.__getRegisteredCommand('utplsql.setWalletPassword')?.();

  assert.strictEqual(map.get('utplsql.wallet.w1'), 'wallet-pass');
  assert.strictEqual(getWalletPassword('w1'), 'wallet-pass');
  assert.ok(__getInformationMessages().some((m) => m.includes('DEV')));
});

test('setWalletPassword: senha vazia limpa a wallet', async () => {
  const { getWalletPassword, initSecretStorage, setWalletPassword } = await walletModule();
  await register();
  const { map, storage } = fakeSecrets();
  initSecretStorage(storage);
  __setConfigValue('profiles', [{ id: 'w2', name: 'DEV', connection: 'u@//h:1521/s' }]);
  __setConfigValue('activeProfile', 'w2');
  await setWalletPassword('w2', 'old');
  __setInputBoxResults(['']);

  await commands.__getRegisteredCommand('utplsql.setWalletPassword')?.();

  assert.strictEqual(getWalletPassword('w2'), undefined);
  assert.ok(!map.has('utplsql.wallet.w2'));
});

test('setWalletPassword: cancelar não altera a wallet', async () => {
  const { getWalletPassword, initSecretStorage } = await walletModule();
  await register();
  initSecretStorage(fakeSecrets().storage);
  __setConfigValue('profiles', [{ id: 'w3', name: 'DEV', connection: 'u@//h:1521/s' }]);
  __setConfigValue('activeProfile', 'w3');
  __setInputBoxResults([undefined]);

  await commands.__getRegisteredCommand('utplsql.setWalletPassword')?.();

  assert.strictEqual(getWalletPassword('w3'), undefined);
});
