#!/usr/bin/env bash
# Espera o PDB do container abrir em READ WRITE.
# Uso: wait-ready.sh <container> <pdb> [timeout_segundos]
set -euo pipefail

CONTAINER="${1:?uso: wait-ready.sh <container> <pdb> [timeout]}"
PDB="${2:?uso: wait-ready.sh <container> <pdb> [timeout]}"
TIMEOUT="${3:-900}"
INTERVAL=10

deadline=$(( $(date +%s) + TIMEOUT ))
printf '[wait-ready] aguardando %s / %s (timeout %ss)\n' "$CONTAINER" "$PDB" "$TIMEOUT"

while :; do
  if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" >/dev/null 2>&1; then
    echo "[wait-ready] container ${CONTAINER} não existe" >&2
    exit 1
  fi
  out=$(docker exec -i "$CONTAINER" bash -lc \
    "\$ORACLE_HOME/bin/sqlplus -s / as sysdba" <<SQL 2>/dev/null | tr -d '\r' || true
SET HEADING OFF FEEDBACK OFF PAGESIZE 0
ALTER SESSION SET CONTAINER=${PDB};
SELECT open_mode FROM v\$database;
EXIT
SQL
)
  if grep -q 'READ WRITE' <<<"$out"; then
    echo "[wait-ready] ${PDB} está READ WRITE"
    exit 0
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "[wait-ready] timeout aguardando ${PDB}. Última saída: ${out:-<vazia>}" >&2
    exit 1
  fi
  sleep "$INTERVAL"
done
