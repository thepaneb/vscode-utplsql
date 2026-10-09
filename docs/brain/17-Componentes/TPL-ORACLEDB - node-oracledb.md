---
id: TPL-ORACLEDB
aliases: [TPL-ORACLEDB]
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
implementacao: ["src/oracleClient.ts", "src/oracleRunner.ts"]
testes: []
regras: [BR-CONN-012, BR-EXEC-001, BR-DEP-001]
relacionado: ["[[ADR-001 - Execucao via Oracle direto]]", "[[ADR-011 - Thick mode opt-in e matriz de bancos]]", "[[MOC - Oracle]]"]
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

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Componentes]]
- 📐 Regras: [[BR-CONN-012 - Thick opt-in, fixado na primeira chamada e idempotente|BR-CONN-012]] · [[BR-EXEC-001 - Execução usa duas conexões dedicadas (conn1 runner, conn2 poll)|BR-EXEC-001]] · [[BR-DEP-001 - Runtime deps em dependencies e nota DEP- para cada dep direta|BR-DEP-001]]
- 🧩 Código: [[COD - oracleClient.ts]] · [[COD - oracleRunner.ts]]
- 🔗 [[ADR-001 - Execucao via Oracle direto]] · [[ADR-011 - Thick mode opt-in e matriz de bancos]] · [[MOC - Oracle]]
- ↩️ Referenciada por: [[GLOSS-008 - Thin vs Thick (node-oracledb)|GLOSS-008]] · [[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL|NFR-001]]
<!-- brain:auto:end -->
