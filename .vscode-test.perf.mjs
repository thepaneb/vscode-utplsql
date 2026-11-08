// Config do harness de performance (PRD-106): roda só out/test/perf e usa a
// fixture gerada por `npm run perf:generate`. Fora do `npm test` padrão.
import base from './.vscode-test.mjs';

export default {
  ...base,
  files: 'out/test/perf/**/*.test.js',
  env: {
    ...base.env,
    UTPLSQL_PERF_PACKAGES: process.env.UTPLSQL_PERF_PACKAGES ?? '',
    UTPLSQL_PERF_TESTS: process.env.UTPLSQL_PERF_TESTS ?? '15',
  },
  mocha: {
    ...base.mocha,
    timeout: 600_000,
  },
};
