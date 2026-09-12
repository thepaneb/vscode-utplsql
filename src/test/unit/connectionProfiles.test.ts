import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import type { UtConfig } from '../../config';
import {
  findProfileById,
  findSqlDevConnectionsPath,
  getActiveProfile,
  getAllProfiles,
  importFromSqlDeveloper,
  maskConnection,
  mergeProfileConfig,
  parseSqlDevConnections,
  pickProfileOrGuide,
  saveProfiles,
  selectProfile,
  setActiveProfile,
} from '../../connectionProfiles';
import type { ConnectionProfile } from '../../types';
import {
  __getLastQuickPickItems,
  __resetConfigValues,
  __resetLastQuickPickItems,
  __setConfigValue,
  __setQuickPickResult,
  __setWarningResult,
  commands as stubCommands,
} from '../vscode-stub';

function makeGlobal(over: Partial<UtConfig> = {}): UtConfig {
  return {
    sourcePath: 'install',
    includePatterns: ['**/*.pks'],
    coverageOwner: '',
    additionalReporters: [],
    timeoutMinutes: 60,
    dbmsOutput: false,
    oraclePoolMin: 2,
    oraclePoolMax: 10,
    oraclePoolIncrement: 1,
    oraclePoolPingInterval: 60,
    codeLensEnabled: true,
    statusBarEnabled: true,
    decorationsEnabled: true,
    compilationDiagnosticsEnabled: true,
    organization: 'file',
    organizationSchemaPattern: 'db/{schema}/**',
    setupDiagnosticsEnabled: true,
    sqlCoverageEnabled: false,
    debuggerEnabled: true,
    debuggerStopOnException: true,
    debuggerTimeoutSeconds: 300,
    scriptRunnerStopOnError: true,
    scriptRunnerAutoCommit: true,
    scriptRunnerFilePattern: '**/*.{sql,pks,pkb,fnc,prc,trg}',
    scriptRunnerDbmsOutput: false,
    scriptRunnerTimeoutSeconds: 300,
    language: 'auto',
    ...over,
  };
}

test('maskConnection: esconde a senha', () => {
  assert.strictEqual(maskConnection('scott/tiger@localhost:1521/XE'), 'scott@localhost:1521/XE');
  assert.strictEqual(maskConnection('user/pass@//host:1521/svc'), 'user@//host:1521/svc');
});

test('maskConnection: sem senha nao altera', () => {
  assert.strictEqual(maskConnection('scott@localhost:1521/XE'), 'scott@localhost:1521/XE');
});

test('maskConnection: formato invalido retorna a string', () => {
  assert.strictEqual(maskConnection('sem-formato'), 'sem-formato');
});

test('parseSqlDevConnections: XML valido gera perfis', () => {
  const xml = `<Reference name="DEV" className="oracle.jdeveloper.db.adapter.DatabaseProvider"
     userName="scott" password="tiger">
    <StringRefAddr addrType="hostname">localhost</StringRefAddr>
    <StringRefAddr addrType="port">1521</StringRefAddr>
    <StringRefAddr addrType="serviceName">XEPDB1</StringRefAddr>
  </Reference>
  <Reference name="TEST" className="oracle.jdeveloper.db.adapter.DatabaseProvider"
     userName="app" password="secret">
    <StringRefAddr addrType="hostname">db-test</StringRefAddr>
    <StringRefAddr addrType="port">1521</StringRefAddr>
    <StringRefAddr addrType="serviceName">TESTPDB</StringRefAddr>
  </Reference>`;
  const profiles = parseSqlDevConnections(xml);
  assert.strictEqual(profiles.length, 2);
  assert.strictEqual(profiles[0].name, 'DEV');
  assert.strictEqual(profiles[0].connection, 'scott/tiger@localhost:1521/XEPDB1');
  assert.strictEqual(profiles[1].name, 'TEST');
  assert.ok(profiles[0].id);
});

test('parseSqlDevConnections: sem host ignora a conexao', () => {
  const xml = `<Reference name="NOHOST" userName="scott" password="tiger">
    <StringRefAddr addrType="port">1521</StringRefAddr>
  </Reference>`;
  assert.deepStrictEqual(parseSqlDevConnections(xml), []);
});

test('parseSqlDevConnections: XML invalido retorna array vazio', () => {
  assert.deepStrictEqual(parseSqlDevConnections('não é xml'), []);
  assert.deepStrictEqual(parseSqlDevConnections(''), []);
});

test('findSqlDevConnectionsPath: encontra connections.xml em system*', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sqldev-'));
  try {
    const dir = path.join(base, 'system19.4.0', 'o.jdeveloper.db.connection');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'connections.xml'), '<dummy/>');
    assert.strictEqual(findSqlDevConnectionsPath([base]), path.join(dir, 'connections.xml'));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('findSqlDevConnectionsPath: base inexistente retorna undefined', () => {
  assert.strictEqual(
    findSqlDevConnectionsPath([path.join(os.tmpdir(), 'nao-existe-xyz')]),
    undefined,
  );
});

test('mergeProfileConfig: sem perfil retorna global', () => {
  const global = makeGlobal();
  assert.strictEqual(mergeProfileConfig(global, undefined), global);
});

test('mergeProfileConfig: perfil sobrescreve campos e herda o resto', () => {
  const global = makeGlobal({ sourcePath: 'install', coverageOwner: 'UT3' });
  const profile: ConnectionProfile = {
    id: 'p1',
    name: 'DEV',
    connection: 'dev/pass@//host:1521/svc',
    sourcePath: 'db/dev',
  };
  const merged = mergeProfileConfig(global, profile);
  assert.strictEqual(merged.sourcePath, 'db/dev');
  assert.strictEqual(merged.coverageOwner, 'UT3');
});

test('findProfileById: encontra por id', () => {
  const profiles: ConnectionProfile[] = [
    { id: 'a', name: 'A', connection: 'c' },
    { id: 'b', name: 'B', connection: 'c' },
  ];
  assert.strictEqual(findProfileById(profiles, 'b')?.name, 'B');
  assert.strictEqual(findProfileById(profiles, 'zzz'), undefined);
});

test('getActiveProfile: sem activeProfile retorna undefined', () => {
  __resetConfigValues();
  assert.strictEqual(getActiveProfile(), undefined);
});

test('getActiveProfile: retorna perfil pelo id', () => {
  const profiles = [
    { id: 'p1', name: 'DEV', connection: 'dev/pass@db' },
    { id: 'p2', name: 'TEST', connection: 'test/pass@db' },
  ];
  __setConfigValue('profiles', profiles);
  __setConfigValue('activeProfile', 'p2');
  try {
    const active = getActiveProfile();
    assert.strictEqual(active?.name, 'TEST');
    assert.strictEqual(active?.connection, 'test/pass@db');
  } finally {
    __resetConfigValues();
  }
});

test('saveProfiles/setActiveProfile: persistem na config stub', async () => {
  __resetConfigValues();
  const profiles: ConnectionProfile[] = [{ id: 'p1', name: 'DEV', connection: 'c' }];
  await saveProfiles(profiles);
  await setActiveProfile('p1');
  try {
    assert.strictEqual(getActiveProfile()?.name, 'DEV');
  } finally {
    __resetConfigValues();
  }
});

test('selectProfile: retorna o perfil escolhido no QuickPick', async () => {
  const profiles: ConnectionProfile[] = [
    { id: 'p1', name: 'DEV', connection: 'dev/secret@localhost:1521/XE', isDefault: true },
  ];
  __setQuickPickResult({ label: 'DEV', profile: profiles[0] });
  try {
    const selected = await selectProfile(profiles);
    assert.strictEqual(selected?.id, 'p1');
  } finally {
    __setQuickPickResult(undefined);
  }
});

test('selectProfile: cancelado retorna undefined', async () => {
  __setQuickPickResult(undefined);
  const selected = await selectProfile([{ id: 'p1', name: 'DEV', connection: 'c' }]);
  assert.strictEqual(selected, undefined);
});

test('getAllProfiles: retorna a lista salva em utplsql.profiles', () => {
  __resetConfigValues();
  __setConfigValue('profiles', [
    { id: 'p1', name: 'DEV', connection: 'dev/pass@db' },
    { id: 'p2', name: 'TEST', connection: 'test/pass@db' },
  ]);
  try {
    const profiles = getAllProfiles();
    assert.strictEqual(profiles.length, 2);
    assert.strictEqual(profiles[1].name, 'TEST');
  } finally {
    __resetConfigValues();
  }
});

test('getAllProfiles: sem config retorna []', () => {
  __resetConfigValues();
  assert.deepStrictEqual(getAllProfiles(), []);
});

test('importFromSqlDeveloper: lê connections.xml do APPDATA e gera perfis', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'appdata-'));
  const connDir = path.join(base, 'SQL Developer', 'system19.4.0', 'o.jdeveloper.db.connection');
  fs.mkdirSync(connDir, { recursive: true });
  fs.writeFileSync(
    path.join(connDir, 'connections.xml'),
    `<Reference name="DEV" className="oracle.jdeveloper.db.adapter.DatabaseProvider"
       userName="scott" password="tiger">
      <StringRefAddr addrType="hostname">localhost</StringRefAddr>
      <StringRefAddr addrType="port">1521</StringRefAddr>
      <StringRefAddr addrType="serviceName">XEPDB1</StringRefAddr>
    </Reference>`,
  );
  const origAppdata = process.env.APPDATA;
  process.env.APPDATA = base;
  try {
    const profiles = await importFromSqlDeveloper();
    assert.strictEqual(profiles.length, 1);
    assert.strictEqual(profiles[0].name, 'DEV');
    assert.strictEqual(profiles[0].connection, 'scott/tiger@localhost:1521/XEPDB1');
  } finally {
    if (origAppdata === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = origAppdata;
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('importFromSqlDeveloper: sem connections.xml retorna []', async () => {
  const origAppdata = process.env.APPDATA;
  process.env.APPDATA = fs.mkdtempSync(path.join(os.tmpdir(), 'appdata-empty-'));
  try {
    const profiles = await importFromSqlDeveloper();
    assert.deepStrictEqual(profiles, []);
  } finally {
    if (origAppdata === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = origAppdata;
  }
});

test('parseSqlDevConnections: Reference sem name é ignorado', () => {
  const xml = `<Reference userName="scott" password="t">
    <StringRefAddr addrType="hostname">h</StringRefAddr>
  </Reference>`;
  assert.deepStrictEqual(parseSqlDevConnections(xml), []);
});

test('parseSqlDevConnections: host sem porta/serviço usa vazio', () => {
  const xml = `<Reference name="X" userName="u" password="p">
    <StringRefAddr addrType="hostname">h</StringRefAddr>
  </Reference>`;
  const ps = parseSqlDevConnections(xml);
  assert.strictEqual(ps[0].connection, 'u/p@h:/');
});

test('findSqlDevConnectionsPath: sem system dirs retorna undefined', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sqldev-none-'));
  try {
    fs.mkdirSync(path.join(base, 'not-system'));
    assert.strictEqual(findSqlDevConnectionsPath([base]), undefined);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('activeProfileName: sem perfil ativo retorna undefined', () => {
  __resetConfigValues();
  const { activeProfileName } = require('../../connectionProfiles.js');
  assert.strictEqual(activeProfileName(), undefined);
});

test('mergeProfileConfig: perfil com includePatterns usa os do perfil', () => {
  const global = makeGlobal();
  const profile: ConnectionProfile = {
    id: 'p1',
    name: 'DEV',
    connection: 'c',
    includePatterns: ['**/*.pkb'],
  };
  const merged = mergeProfileConfig(global, profile);
  assert.deepStrictEqual(merged.includePatterns, ['**/*.pkb']);
});

interface QuickPickItem {
  label: string;
  description: string;
  detail?: string;
  profile: ConnectionProfile;
}

function lastItems(): QuickPickItem[] {
  return (__getLastQuickPickItems() ?? []) as QuickPickItem[];
}

test('selectProfile: exibe description no detail e máscara a conexão', async () => {
  const profiles: ConnectionProfile[] = [
    {
      id: 'p1',
      name: 'DEV Local',
      connection: 'dev/secret@localhost:1521/XE',
      description: 'Banco local de desenvolvimento',
      isDefault: true,
    },
  ];
  __resetLastQuickPickItems();
  __setQuickPickResult({ label: 'DEV Local', profile: profiles[0] });
  try {
    const selected = await selectProfile(profiles);
    assert.strictEqual(selected?.id, 'p1');
    const items = lastItems();
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].description, 'dev@localhost:1521/XE');
    assert.ok(!items[0].description.includes('secret'));
    assert.ok(items[0].detail?.includes('Banco local de desenvolvimento'));
    assert.ok(items[0].detail?.includes('Default'));
  } finally {
    __setQuickPickResult(undefined);
    __resetLastQuickPickItems();
  }
});

test('selectProfile: charset não-utf8 aparece ao lado da conexão', async () => {
  const profiles: ConnectionProfile[] = [
    { id: 'p1', name: 'LEGADO', connection: 'u/p@h:1521/s', charset: 'win1252' },
    { id: 'p2', name: 'DEV', connection: 'u/p@h:1521/s', charset: 'utf8' },
    { id: 'p3', name: 'PLAIN', connection: 'u/p@h:1521/s' },
  ];
  __resetLastQuickPickItems();
  __setQuickPickResult(undefined);
  try {
    await selectProfile(profiles);
    const items = lastItems();
    assert.ok(items[0].description.includes('win1252'));
    assert.ok(!items[1].description.includes('utf8'));
    assert.ok(!items[2].description.includes('utf8'));
  } finally {
    __setQuickPickResult(undefined);
    __resetLastQuickPickItems();
  }
});

test('pickProfileOrGuide: com perfis delega ao QuickPick', async () => {
  const profiles: ConnectionProfile[] = [{ id: 'p1', name: 'DEV', connection: 'c' }];
  __resetConfigValues();
  __setConfigValue('profiles', profiles);
  __setQuickPickResult({ label: 'DEV', profile: profiles[0] });
  try {
    assert.strictEqual((await pickProfileOrGuide())?.id, 'p1');
  } finally {
    __setQuickPickResult(undefined);
    __resetConfigValues();
  }
});

test('pickProfileOrGuide: sem perfis e sem escolha retorna undefined', async () => {
  __resetConfigValues();
  __setWarningResult(undefined);
  try {
    assert.strictEqual(await pickProfileOrGuide(), undefined);
  } finally {
    __setWarningResult(undefined);
    __resetConfigValues();
  }
});

test('findSqlDevConnectionsPath: system dir sem connections.xml é ignorado', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sqldev-noconn-'));
  try {
    fs.mkdirSync(path.join(base, 'system21.1.0'));
    assert.strictEqual(findSqlDevConnectionsPath([base]), undefined);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('pickProfileOrGuide: escolha "Novo perfil" dispara utplsql.newProfile', async () => {
  __resetConfigValues();
  __setWarningResult('Novo perfil');
  stubCommands.__resetExecutedCommands();
  try {
    assert.strictEqual(await pickProfileOrGuide(), undefined);
    assert.ok(stubCommands.__getExecutedCommands().includes('utplsql.newProfile'));
  } finally {
    __setWarningResult(undefined);
    stubCommands.__resetExecutedCommands();
    __resetConfigValues();
  }
});

test('pickProfileOrGuide: escolha "Importar" dispara importSqlDevConnections', async () => {
  __resetConfigValues();
  __setWarningResult('Importar do SQL Developer');
  stubCommands.__resetExecutedCommands();
  try {
    assert.strictEqual(await pickProfileOrGuide(), undefined);
    assert.ok(stubCommands.__getExecutedCommands().includes('utplsql.importSqlDevConnections'));
  } finally {
    __setWarningResult(undefined);
    stubCommands.__resetExecutedCommands();
    __resetConfigValues();
  }
});

test('pickProfileOrGuide: após criar perfil, repete o picker e retorna', async () => {
  const created: ConnectionProfile[] = [{ id: 'p9', name: 'NOVO', connection: 'c' }];
  __resetConfigValues();
  __setWarningResult('Novo perfil');
  __setQuickPickResult({ label: 'NOVO', profile: created[0] });
  stubCommands.__setExecuteCommandImpl(() => {
    __setConfigValue('profiles', created);
  });
  try {
    assert.strictEqual((await pickProfileOrGuide())?.id, 'p9');
  } finally {
    __setWarningResult(undefined);
    __setQuickPickResult(undefined);
    stubCommands.__setExecuteCommandImpl(undefined);
    __resetConfigValues();
  }
});
