---
id: BR-PARSE-014
aliases: [BR-PARSE-014]
tipo: regra
titulo: message.location só é definida para failed/error com frame de usuário resolvido
dominio: resultados
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-25
implementacao: ["src/results.ts:59", "src/results.ts:61", "src/results.ts:68", "src/results.ts:71", "src/results.ts:78", "src/results.ts:79", "src/results.ts:86", "src/results.ts:90", "src/results.ts:137", "src/results.ts:138", "src/results.ts:146", "src/results.ts:147"]
testes: ["src/test/unit/results.test.ts", "src/test/integration/jumpToFailureE2E.test.ts"]
prds: ["PRD-29"]
requisitos: ["PRD-29/RF1"]
tags: ["resultados"]
---
## Enunciado

packageFromFrameObject extrai o package do objectName do frame por contagem de segmentos: um segmento devolve o próprio, dois devolvem o último e três ou mais devolvem o penúltimo, de modo a igualar ao packageName do TestItem, que vem do nome do arquivo .pks. Ao aplicar resultados, TestMessage.location é atribuída apenas nos status failed e error e somente se houver stackFrames; a resolução escolhe o primeiro frame de usuário, procura cachedItems por suite com packageName igual (minúsculo) ao packageName do frame e, sem match, tenta <packageName>.pks em cada workspace folder, preferindo arquivo existente; a posição é line-1.

## Pré-condições

stackFrames populado; cachedItems e/ou workspace folders disponíveis.

## Exceções

passed/skipped nunca recebem location; frames internos, packageName sem match e ausência de workspace folders resultam em location indefinida.

## Justificativa

Habilita o Go to Error nativo do VSCode apenas quando há local confiável, sem apontar para arquivos inexistentes. Comparar pelo package (e não pelo objectName qualificado com schema e procedure) é o que faz o frame real do utPLSQL casar com a suite descoberta.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-29-jump-to-failing-assertion|PRD-29]]
- 🎯 Requisitos: [[prd-29-jump-to-failing-assertion|PRD-29 RF1]]
- 🧩 Código: [[COD - results.ts]]
- 🧪 Testes: [[TST - results.test.ts]] · [[TST - jumpToFailureE2E.test.ts]]
- ↩️ Referenciada por: [[03-results-and-reporting]] · [[08-jump-to-failure]]
<!-- brain:auto:end -->
