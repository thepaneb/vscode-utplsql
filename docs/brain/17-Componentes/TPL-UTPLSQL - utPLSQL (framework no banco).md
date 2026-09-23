---
id: TPL-UTPLSQL
tipo: componente-terceiro
titulo: "utPLSQL (framework no banco)"
dominio: banco
fornecedor: utPLSQL
licenca: Apache-2.0
criticidade: critica
risco: medio
url: https://github.com/utPLSQL/utPLSQL
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["banco"]
---
## Papel

Framework de testes que roda dentro do Oracle; a extensão é um cliente
(`ut_runner.run`, reporters, `get_suites_info`).

## Riscos

Versão mínima `UTPLSQL_MIN_VERSION` (3.1.0); `get_suites_info` exige 3.1.3;
shared install depende de synonyms/grants (`UT3.`).

## Upgrade/saída

Sem alternativa; degradar para fallback `ALL_OBJECTS/ALL_SOURCE` em versões antigas.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Componentes]]
<!-- brain:auto:end -->
