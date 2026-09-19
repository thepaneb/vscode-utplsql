#!/usr/bin/env bash
# Espera o PDB do container abrir em READ WRITE.
# Uso: wait-ready.sh <container> <pdb> [timeout_segundos]
# Env: ORACLE_PWD (senha do SYS)
#
# Conecta como SYSDBA POR REDE (e não por OS auth): em algumas imagens (18c XE)
# o bequeath local `/ as sysdba` falha com ORA-12547, enquanto o listener
# responde normalmente. Em contrapartida, a imagem 12.2.0.1 ignora ORACLE_PWD e
# mantém a senha default do SYS; quando o OS auth está disponível normalizamos a
# senha para ORACLE_PWD (idempotente).
set -euo pipefail

CONTAINER="${1:?uso: wait-ready.sh <container> <pdb> [timeout]}"
PDB="${2:?uso: wait-ready.sh <container> <pdb> [timeout]}"
TIMEOUT="${3:-1800}"
SYS_PWD="${ORACLE_PWD:-Oracle#2026}"
INTERVAL=10

deadline=$(( $(date +%s) + TIMEOUT ))
printf '[wait-ready] aguardando %s / %s (timeout %ss)\n' "$CONTAINER" "$PDB" "$TIMEOUT"

# Normaliza a senha do SYS para ORACLE_PWD via OS auth (quando existir).
# SYS é usuário comum: alterar no root vale para todos os containers.
normalize_sys_password() {
  printf 'ALTER USER sys IDENTIFIED BY "%s";\nEXIT\n' "$SYS_PWD" \
    | docker exec -i "$CONTAINER" bash -lc '$ORACLE_HOME/bin/sqlplus -s / as sysdba' \
      >/dev/null 2>&1 || true
}

attempted_normalize=0
while :; do
  if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" >/dev/null 2>&1; then
    echo "[wait-ready] container ${CONTAINER} não existe" >&2
    exit 1
  fi
  out=$(docker exec -i -e "DBP=$SYS_PWD" -e "DBS=$PDB" "$CONTAINER" bash -lc \
    '$ORACLE_HOME/bin/sqlplus -s "sys/$DBP@//localhost:1521/$DBS" as sysdba' <<SQL 2>/dev/null | tr -d '\r' || true
SET HEADING OFF FEEDBACK OFF PAGESIZE 0
SELECT open_mode FROM v\$database;
EXIT
SQL
)
  if grep -q 'READ WRITE' <<<"$out"; then
    echo "[wait-ready] ${PDB} está READ WRITE"
    exit 0
  fi
  # Senha do SYS não é ORACLE_PWD (ex.: 12.2 default) e o OS auth existe:
  # normaliza uma vez e re-tenta.
  if [ "$attempted_normalize" = 0 ] && grep -q 'ORA-01017' <<<"$out"; then
    attempted_normalize=1
    echo "[wait-ready] SYSDBA por rede negado; tentando normalizar via OS auth"
    normalize_sys_password
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "[wait-ready] timeout aguardando ${PDB}. Última saída: ${out:-<vazia>}" >&2
    exit 1
  fi
  sleep "$INTERVAL"
done
