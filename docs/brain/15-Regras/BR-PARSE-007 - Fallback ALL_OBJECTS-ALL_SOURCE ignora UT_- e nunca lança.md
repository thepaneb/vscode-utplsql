---
id: BR-PARSE-007
tipo: regra
titulo: Fallback ALL_OBJECTS/ALL_SOURCE ignora UT_* e nunca lança
dominio: descoberta
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/discovery.ts:137", "src/discovery.ts:159", "src/discovery.ts:167", "src/discovery.ts:174", "src/discovery.ts:178", "src/discovery.ts:188", "src/discovery.ts:199"]
testes: ["src/test/unit/discovery.test.ts"]
prds: ["PRD-43"]
tags: ["descoberta"]
---
## Enunciado

A descoberta por banco lista PACKAGE com status VALID em ALL_OBJECTS (owner em maiúsculas), ignora nomes que casam /^UT_/i e lê ALL_SOURCE ordenado por linha; se ALL_SOURCE for inacessível (ex.: ORA-00942) o package é pulado silenciosamente; acima de 10.000 linhas emite warning e ainda parseia.

## Pré-condições

Conexão Oracle disponível com acesso a ALL_OBJECTS/ALL_SOURCE; schema informado.

## Exceções

Falha total de conexão/consulta retorna lista vazia sem lançar; pacotes do framework utPLSQL (UT_*) são excluídos.

## Justificativa

Suporta instalações shared e schemas sem grants sem derrubar a extensão, e evita truncamento silencioso de packages grandes.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-43-schema-db-discovery|PRD-43]]
- ↩️ Referenciada por: [[ERR-001 - ORA-00942 — objeto utPLSQL inacessível (shared install sem grants)|ERR-001]] · [[ERR-008 - ALL_SOURCE inacessível na descoberta (package pulado)|ERR-008]] · [[ERR-011 - Fonte de package truncada (-10.000 linhas)|ERR-011]]
<!-- brain:auto:end -->
