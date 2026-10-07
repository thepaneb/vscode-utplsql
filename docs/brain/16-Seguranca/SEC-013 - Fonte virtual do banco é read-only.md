---
id: SEC-013
aliases: [SEC-013]
tipo: seguranca
titulo: Fonte virtual do banco é read-only
dominio: segredos
status: ativo
severidade: baixa
verificado: 2026-09-28
implementacao: ["src/virtualSource.ts:11", "src/dbSourceProvider.ts:173"]
testes: ["src/test/unit/dbSourceProvider.test.ts"]
regras: ["BR-COB-004"]
prds: ["PRD-80"]
requisitos: ["PRD-80/RNF3"]
tags: ["seguranca", "cobertura"]
---
## Enunciado

A fonte virtual do banco (`utplsql-source:`) é **read-only**: apenas lê `ALL_SOURCE` e serve o documento; nunca escreve no banco, em disco ou fora do workspace.

## Controle

`fetchDbObjectSource` só executa `SELECT ... FROM all_source`; `virtualSourceUri` gera apenas URIs de leitura; o cache é em memória.

## Justificativa

Garantir que o fallback de falhas/cobertura não abra caminho de escrita ou de path traversal.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📄 PRDs: [[prd-80-virtual-db-source|PRD-80]]
- 📐 Regras: [[BR-COB-004 - Fonte virtual do banco (utplsql-source) é read-only|BR-COB-004]]
- 🎯 Requisitos: [[prd-80-virtual-db-source|PRD-80 RNF3]]
- 🧩 Código: [[COD - virtualSource.ts]] · [[COD - dbSourceProvider.ts]]
- 🧪 Testes: [[TST - dbSourceProvider.test.ts]]
- ↩️ Referenciada por: [[prd-80-virtual-db-source|PRD-80]]
<!-- brain:auto:end -->
