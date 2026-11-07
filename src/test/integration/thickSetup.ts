/// <reference types="mocha" />
// Setup carregado pelo mocha ANTES dos arquivos .test no eixo thick-full.
//
// Os testes abrem conexões raw (`oracledb.getConnection`) antes de chamar
// `ensurePool`; sem inicializar o cliente primeiro, o driver entra em thin e o
// `initOracleClient` posterior falha com NJS-118 (thick depois de thin). O
// processo do host é isolado por `.vscode-test.thick-full.mjs`, então esta é a
// única inicialização thick.
import * as oracledb from 'oracledb';

const libDir = (process.env.ORACLE_CLIENT_LIB_DIR ?? '').trim();
if (process.env.UTPLSQL_THICK_TEST === '1' && libDir) {
  try {
    oracledb.initOracleClient({ libDir });
  } catch (e) {
    // O host pode já ter inicializado thick (ativação/setup). Só repropaga erro
    // que não seja "já inicializado".
    const message = e instanceof Error ? e.message : String(e);
    if (!/already initialized|NJS-080|NJS-081|NJS-090/i.test(message)) throw e;
  }
}
