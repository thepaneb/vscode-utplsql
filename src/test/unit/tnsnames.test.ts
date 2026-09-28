import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  looksLikeTnsAlias,
  parseTnsnames,
  resolveTnsAdminPath,
  resolveTnsAlias,
} from '../../tnsnames';

const SAMPLE = `
# comentário de topo
DEV =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = dev-db)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = XEPDB1)
    )
  )

PROD = (DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = prod)(PORT = 1522)) (CONNECT_DATA = (SERVICE_NAME = PROD)))

# com comentário inline
QA = (DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = qa)(PORT = 1521)) (CONNECT_DATA = (SERVICE_NAME = QA)))
`;

test('parseTnsnames: extrai aliases, DESCRITION multilinha e ignora comentários', () => {
  const map = parseTnsnames(SAMPLE);
  assert.deepStrictEqual([...map.keys()].sort(), ['DEV', 'PROD', 'QA']);
  assert.ok(map.get('DEV')?.includes('HOST = dev-db'));
  assert.ok(map.get('DEV')?.includes('SERVICE_NAME = XEPDB1'));
  assert.ok(map.get('QA')?.includes('SERVICE_NAME = QA'));
});

test('resolveTnsAlias: case-insensitive e alias inexistente → undefined', () => {
  assert.strictEqual(resolveTnsAlias(SAMPLE, 'dev'), parseTnsnames(SAMPLE).get('DEV'));
  assert.strictEqual(resolveTnsAlias(SAMPLE, 'Dev'), parseTnsnames(SAMPLE).get('DEV'));
  assert.strictEqual(resolveTnsAlias(SAMPLE, 'NAO_EXISTE'), undefined);
});

test('parseTnsnames: conteúdo vazio retorna mapa vazio', () => {
  assert.strictEqual(parseTnsnames('').size, 0);
  assert.strictEqual(parseTnsnames('# só comentário\n').size, 0);
});

test('parseTnsnames: valor sem parênteses é aceito', () => {
  assert.strictEqual(parseTnsnames('BARE = somevalue\n').get('BARE'), 'somevalue');
});

test('parseTnsnames: linha sem `=` é ignorada', () => {
  const map = parseTnsnames(
    'lixo sem igual\nGOOD = (DESCRIPTION = (ADDRESS = (HOST = h)(PORT = 1)))\n',
  );
  assert.ok(map.get('GOOD')?.includes('HOST = h'));
  assert.ok(!map.has('LIXO'));
});

test('looksLikeTnsAlias: alias sim; Easy Connect não', () => {
  assert.ok(looksLikeTnsAlias('MYALIAS'));
  assert.ok(looksLikeTnsAlias('my_alias.db-1'));
  assert.ok(!looksLikeTnsAlias('//host:1521/svc'));
  assert.ok(!looksLikeTnsAlias('host:1521/svc'));
  assert.ok(!looksLikeTnsAlias('user@host'));
  assert.ok(!looksLikeTnsAlias('(DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)))'));
});

test('resolveTnsAdminPath: setting > SQL Developer (user) > env', () => {
  assert.strictEqual(resolveTnsAdminPath('/setting', '/sqldev', '/env'), '/setting');
  assert.strictEqual(resolveTnsAdminPath('', '/sqldev', '/env'), '/sqldev');
  assert.strictEqual(resolveTnsAdminPath('  ', undefined, '/env'), '/env');
  assert.strictEqual(resolveTnsAdminPath('', '', ''), undefined);
  assert.strictEqual(resolveTnsAdminPath(undefined, undefined, undefined), undefined);
});
