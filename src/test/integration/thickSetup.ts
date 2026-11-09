/// <reference types="mocha" />
// Setup carregado pelo mocha ANTES dos arquivos .test no eixo thick-full.
//
// Os testes abrem conexões raw (`oracledb.getConnection`) antes de chamar
// `ensurePool`; sem inicializar o cliente primeiro, o driver entra em thin e o
// `initOracleClient` posterior falha com NJS-118 (thick depois de thin). O
// processo do host é isolado por `.vscode-test.thick-full.mjs`, então esta é a
// única inicialização thick.
//
// PRD-150 RF1: o eixo precisa falhar explicitamente se não inicar thick — um
// host thin aqui produziria falso-verde. O marcador `UTPLSQL_THICK_ACTIVE`
// permite a guarda em `thickFullGuard.test.ts`.
import * as oracledb from 'oracledb';

const libDir = (process.env.ORACLE_CLIENT_LIB_DIR ?? '').trim();
const thickAxis = process.env.UTPLSQL_THICK_TEST === '1';

if (thickAxis) {
  if (!libDir) {
    throw new Error(
      'thick-full: ORACLE_CLIENT_LIB_DIR não definido; o eixo não pode iniciar thin.',
    );
  }
  try {
    oracledb.initOracleClient({ libDir });
  } catch (e) {
    // O host pode já ter inicializado thick (ativação/setup). Só repropaga erro
    // que não seja "já inicializado".
    const message = e instanceof Error ? e.message : String(e);
    if (!/already initialized|NJS-080|NJS-081|NJS-090/i.test(message)) throw e;
  }
  if (oracledb.thin !== false) {
    throw new Error('thick-full: o driver não iniciou em thick (oracledb.thin !== false).');
  }
  process.env.UTPLSQL_THICK_ACTIVE = '1';
}
