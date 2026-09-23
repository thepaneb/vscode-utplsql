---
id: TPL-ORACLEDB
tipo: componente-terceiro
titulo: "node-oracledb"
dominio: banco
fornecedor: Oracle
licenca: Apache-2.0 OR UPL-1.0
criticidade: critica
risco: alto
versao: "^7.0.1"
url: https://github.com/oracle/node-oracledb
adr: ADR-001
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["banco"]
---
## Papel

Driver de conexão e execução direta do utPLSQL, em modo **thin** por padrão (sem
Instant Client) e thick opt-in para bancos com NNE.

## Riscos

Dependência de runtime no processo da extensão; breaking changes em majors;
thin não cobre todos os recursos de rede (wallet/NNE).

## Upgrade/saída

Acompanhar majors (PRD-46); thick é opcional. Sem alternativa prática para Oracle.
