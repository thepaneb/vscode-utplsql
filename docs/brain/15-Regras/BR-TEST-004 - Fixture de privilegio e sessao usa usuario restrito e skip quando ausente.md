---
id: BR-TEST-004
aliases: [BR-TEST-004]
tipo: regra
titulo: Fixture de privilégio/sessão usa usuário restrito e skip quando ausente
dominio: qualidade
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-05
implementacao: ["src/test/integration/fixtures/setup.sh", "src/test/integration/support/unpriv.ts"]
testes: ["src/test/integration/prd107Unpriv.test.ts", "src/test/integration/viewCoverageDenied.test.ts"]
prds: ["PRD-107"]
requisitos: ["PRD-107/RNF1", "PRD-107/RNF2"]
tags: [teste, seguranca]
---

## Enunciado

Testes de privilégio e de ciclo de sessão usam um usuário restrito (somente
`CREATE SESSION`) e um observador com `SELECT ON V_$SESSION`. Quando a fixture
não está provisionada (`UTPLSQL_IT_UNPRIV_*`), a suíte faz `skip` explicativo —
nunca falha. Grants são mínimos e documentados; `V$SQL` fica negado no usuário
restrito.

## Pré-condições

`setup.sh`/`setup.sql` criam o usuário e os grants; `support/unpriv.ts` monta a
conexão e o observador. `ALL_SOURCE` negado continua coberto no unitário, pois
não é revogável por usuário.

## Exceções

Ambientes sem o usuário restrito pulam apenas os testes que dependem dele; a
suíte principal continua.

## Justificativa

Exercita os fallbacks reais (sem privilégio/sem `V$SQL`) e permite observar
sessões de fora para validar o fechamento do pool (PRD-101).
