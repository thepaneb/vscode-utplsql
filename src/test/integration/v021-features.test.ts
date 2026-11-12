/// <reference types="mocha" />
// Testes de integração das PRDs da 0.21.0 no eixo THIN.
// Gate: UTPLSQL_CONN no .env (mesma regra dos demais testes de integração).
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { readConfig } from '../../config';
import { invalidateConfigCache } from '../../configCache';
import {
  clearWalletPassword,
  getWalletPassword,
  setWalletPassword,
} from '../../connectionProfiles';
import { getSuitesInfo } from '../../discovery';
import { clearOracleMetadataCache, oracleMetadataCache } from '../../metadataCache';
import { listReportersOracle, parseConnString } from '../../oracleRunner';

const hasConnection = !!process.env.UTPLSQL_CONN;
const describeDB = hasConnection ? describe : describe.skip;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describeDB('0.21.0 — PRD-130 configuração validada e cacheada', () => {
  it('invalida o cache de readConfig após mudança de setting', async function () {
    this.timeout(30_000);
    const cfg = vscode.workspace.getConfiguration('utplsql');
    const previous = cfg.inspect<string>('organization')?.workspaceValue;
    try {
      await cfg.update('organization', 'tag', vscode.ConfigurationTarget.Workspace);
      await wait(200);
      // O teste roda no host de testes e importa `out/config.js`; o listener
      // do extension host usa o bundle `dist/extension.mjs` (outra instância).
      // Aqui validamos que o snapshot é reconstruído a partir da setting atual.
      invalidateConfigCache();
      assert.strictEqual(
        vscode.workspace.getConfiguration('utplsql').get('organization'),
        'tag',
        'update deveria refletir na configuração',
      );
      assert.strictEqual(readConfig().organization, 'tag');
    } finally {
      await cfg.update('organization', previous, vscode.ConfigurationTarget.Workspace);
      await wait(100);
    }
  });
});

describeDB('0.21.0 — PRD-131 cache de metadados Oracle', () => {
  it('getSuitesInfo/listReportersOracle usam cache TTL e clear invalida', async function () {
    this.timeout(60_000);
    const connStr = process.env.UTPLSQL_CONN as string;
    const parsed = parseConnString(connStr);
    const mod = await import('oracledb');
    const oracledb = (mod as Record<string, unknown>).default as typeof mod;
    const conn = await oracledb.getConnection({
      user: parsed.user,
      password: parsed.password,
      connectString: parsed.connectionString,
    });
    const owner = parsed.user.toUpperCase();
    try {
      clearOracleMetadataCache();
      const suites1 = await getSuitesInfo(conn, owner, `it|${connStr}`);
      const suites2 = await getSuitesInfo(conn, owner, `it|${connStr}`);
      assert.deepStrictEqual(suites2, suites1);
      assert.ok(oracleMetadataCache.stats().hits >= 1, 'get_suites_info deveria cachear');

      const reporters1 = await listReportersOracle(conn, `it|${connStr}`);
      const reporters2 = await listReportersOracle(conn, `it|${connStr}`);
      assert.deepStrictEqual(reporters2, reporters1);
      assert.ok(oracleMetadataCache.stats().hits >= 2, 'reporters deveriam cachear');
    } finally {
      await conn.close().catch(() => {});
      clearOracleMetadataCache();
    }
  });
});

describeDB('0.21.0 — PRD-137 wallet vinculada à connection', () => {
  it('recusa a senha quando a connection do perfil muda', async () => {
    const id = `it-wallet-${Date.now()}`;
    const connection = 'u@//wallet-host:1521/s';
    try {
      await setWalletPassword(id, connection, 'wallet-pass');
      assert.strictEqual(getWalletPassword(id, connection), 'wallet-pass');
      assert.strictEqual(getWalletPassword(id, 'u@//outro-host:1521/s'), undefined);
      // O vínculo divergente limpa o cache: nem a connection original volta.
      assert.strictEqual(getWalletPassword(id, connection), undefined);
    } finally {
      await clearWalletPassword(id);
    }
  });
});
