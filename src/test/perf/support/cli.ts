// CLI da fixture de performance (PRD-106):
//   node out/test/perf/support/cli.js generate --packages 1000 --tests 15 --seed 1
//   node out/test/perf/support/cli.js drop
// Usa UTPLSQL_CONN (mesmo contrato dos testes de integração).
import { dropPerfSql, expectedTestCount, generatePerfSql, parsePerfArgs } from '../perfFixture';

async function main(): Promise<void> {
  const { command, options } = parsePerfArgs(process.argv.slice(2));
  const connectionString = process.env.UTPLSQL_CONN?.trim();
  if (!connectionString) {
    throw new Error('UTPLSQL_CONN não definido (user/pass@//host:port/service)');
  }
  const oracledb = require('oracledb') as typeof import('oracledb');
  const at = connectionString.lastIndexOf('@');
  const credentials = at >= 0 ? connectionString.slice(0, at) : connectionString;
  const connectString = at >= 0 ? connectionString.slice(at + 1) : '';
  const slash = credentials.indexOf('/');
  if (at < 0 || slash < 0) throw new Error('UTPLSQL_CONN inválido (user/pass@//host:port/service)');
  const conn = await oracledb.getConnection({
    user: credentials.slice(0, slash),
    password: credentials.slice(slash + 1),
    connectString,
  });
  try {
    if (command === 'drop') {
      await conn.execute(dropPerfSql(options.prefix), {}, { autoCommit: true });
      console.log(JSON.stringify({ dropped: options.prefix }));
      return;
    }
    const sql = generatePerfSql(options);
    const started = Date.now();
    await conn.execute(sql, {}, { autoCommit: true });
    console.log(
      JSON.stringify({
        generated: options.packages,
        tests: expectedTestCount(options),
        mode: options.mode,
        seed: options.seed,
        ms: Date.now() - started,
      }),
    );
  } finally {
    await conn.close().catch(() => {});
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}
