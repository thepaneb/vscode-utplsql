---
id: BR-PARSE-014
tipo: regra
titulo: message.location só é definida para failed/error com frame de usuário resolvido
dominio: resultados
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/results.ts:55", "src/results.ts:58", "src/results.ts:61", "src/results.ts:64", "src/results.ts:76", "src/results.ts:78", "src/results.ts:121", "src/results.ts:124", "src/results.ts:130", "src/results.ts:133"]
testes: ["src/test/unit/results.test.ts"]
prds: ["PRD-29"]
requisitos: ["PRD-29/RF1"]
tags: ["resultados"]
---
## Enunciado

Ao aplicar resultados, TestMessage.location é atribuída apenas nos status failed e error e somente se houver stackFrames; a resolução escolhe o primeiro frame de usuário, procura cachedItems por suite com packageName igual (minúsculo) ao objectName e, sem match, tenta <objName>.pks em cada workspace folder, preferindo arquivo existente; a posição é line-1.

## Pré-condições

stackFrames populado; cachedItems e/ou workspace folders disponíveis.

## Exceções

passed/skipped nunca recebem location; frames internos, objectName sem match e ausência de workspace folders resultam em location indefinida.

## Justificativa

Habilita o Go to Error nativo do VSCode apenas quando há local confiável, sem apontar para arquivos inexistentes.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-29-jump-to-failing-assertion|PRD-29]]
- 🎯 Requisitos: [[prd-29-jump-to-failing-assertion|PRD-29 RF1]]
<!-- brain:auto:end -->
