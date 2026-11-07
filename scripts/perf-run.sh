#!/usr/bin/env bash
# Harness de performance da PRD-106: gera a fixture no banco e roda o eixo
# de extensão. Requer UTPLSQL_CONN e (para o host) xvfb.
set -euo pipefail

PACKAGES="${UTPLSQL_PERF_PACKAGES:-1000}"
TESTS="${UTPLSQL_PERF_TESTS:-15}"
SEED="${UTPLSQL_PERF_SEED:-1}"
MODE="${UTPLSQL_PERF_MODE:-mixed}"

export UTPLSQL_PERF_PACKAGES="$PACKAGES"
export UTPLSQL_PERF_TESTS="$TESTS"

if [ -z "${UTPLSQL_CONN:-}" ]; then
  echo "ERRO: UTPLSQL_CONN não definido" >&2
  exit 1
fi

npm run compile
node out/test/perf/support/cli.js generate \
  --packages "$PACKAGES" --tests "$TESTS" --seed "$SEED" --mode "$MODE"
xvfb-run -a npm run test:perf
