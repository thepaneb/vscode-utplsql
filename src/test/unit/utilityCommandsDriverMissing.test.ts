import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import { __getErrorMessages, __resetConfigValues, __resetMessages, commands } from '../vscode-stub';

// O loader dinâmico do comando precisa de um spec separado: mock.module não
// deve compartilhar o registro de 'oracledb' com os demais testes.
const missingDriver = {
  get default(): never {
    throw new Error('oracledb ausente');
  },
};
mock.module('oracledb', { namedExports: missingDriver });

test('rebuildAnnotations: driver oracledb ausente mostra aviso amigável', async () => {
  __resetConfigValues();
  __resetMessages();
  commands.__resetRegisteredCommands();
  const originalConnection = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  try {
    const { registerUtilityCommands } = await import('../../commands/utility.js');
    registerUtilityCommands(
      { subscriptions: [] } as never,
      {
        refresh: async () => {},
      } as never,
    );
    await commands.__getRegisteredCommand('utplsql.rebuildAnnotations')?.();
    assert.strictEqual(__getErrorMessages().length, 1);
    assert.match(__getErrorMessages()[0], /oracledb/i);
  } finally {
    if (originalConnection === undefined) delete process.env.UTPLSQL_CONN;
    else process.env.UTPLSQL_CONN = originalConnection;
    __resetConfigValues();
    __resetMessages();
    commands.__resetRegisteredCommands();
  }
});
