import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { resolveConnectString } from '../../oracleRunner';

const TNS = `
DEV = (DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = dev)(PORT = 1521)) (CONNECT_DATA = (SERVICE_NAME = XEPDB1)))
`;

function tempTnsDir(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-tns-'));
  fs.writeFileSync(path.join(dir, 'tnsnames.ora'), content, 'utf8');
  return dir;
}

test('resolveConnectString: alias resolve para o descriptor', () => {
  const dir = tempTnsDir(TNS);
  try {
    const out = resolveConnectString('DEV', dir);
    assert.ok(out.includes('HOST = dev'));
    assert.ok(out.includes('SERVICE_NAME = XEPDB1'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveConnectString: alias inexistente fica inalterado', () => {
  const dir = tempTnsDir(TNS);
  try {
    assert.strictEqual(resolveConnectString('NAO_EXISTE', dir), 'NAO_EXISTE');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveConnectString: Easy Connect não é tratado como alias', () => {
  const dir = tempTnsDir(TNS);
  try {
    assert.strictEqual(resolveConnectString('//host:1521/svc', dir), '//host:1521/svc');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveConnectString: sem tnsAdminPath fica inalterado', () => {
  assert.strictEqual(resolveConnectString('DEV', ''), 'DEV');
});

test('resolveConnectString: tnsnames.ora ausente não lança', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-tns-empty-'));
  try {
    assert.strictEqual(resolveConnectString('DEV', dir), 'DEV');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
