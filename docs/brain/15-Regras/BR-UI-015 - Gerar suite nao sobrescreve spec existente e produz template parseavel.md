---
id: BR-UI-015
aliases: [BR-UI-015]
tipo: regra
titulo: Gerar suíte não sobrescreve spec existente e produz template parseável
dominio: ui
status: ativo
severidade: media
fonte: codigo
verificado: 2026-10-14
implementacao: ["src/scaffold.ts", "src/commands/scaffold.ts"]
testes: ["src/test/unit/scaffold.test.ts", "src/test/unit/scaffoldCommands.test.ts"]
prds: ["PRD-59", "PRD-100"]
requisitos: ["PRD-59/RF1", "PRD-59/RF2", "PRD-59/RNF1", "PRD-100/RF1", "PRD-100/RF3", "PRD-100/RF4", "PRD-100/RNF1"]
tags: ["ui", "scaffold"]
---

# BR-UI-015 — Gerar suíte não sobrescreve spec existente e produz template parseável

## Enunciado

O comando `utplsql.generateTestSuite` (paleta, menu de contexto e Code Action em
`.pks`/`.pkb`) grava `ut_<pacote>.pks` — ao lado do arquivo de produção ou na raiz
do primeiro workspace folder quando a fonte é um objeto do banco — **sem
sobrescrever** arquivo existente: havendo arquivo, exige confirmação modal. O
template gerado é **parseável** pelo parser de annotations (`parseSuiteText`), com
um `%test` por rotina do package (`numberOfTestsPerUnit`, default 1) ou o
esqueleto da PRD-59 quando não há rotinas a extrair. A Code Action é omitida em
specs `ut_*` (o nome usa o prefixo de `utplsql.generate.testPackagePrefix`).

## Pré-condições

Arquivo de produção (`.pks`/`.pkb`/`.sql`/`.fnc`/`.prc`/`.trg`) aberto no editor —
ou nenhum, quando o usuário informa `SCHEMA.OBJETO` do banco — e um workspace
folder para o destino.

## Exceções

Com `utplsql.generate.numberOfTestsPerUnit > 1`, do 2º teste da mesma rotina em
diante o nome recebe sufixo numérico (`add_2`, `add_3`…): sem isso o pacote gerado
declararia `PROCEDURE add;` duas vezes e não compilaria.

## Justificativa

Gerar código dentro do projeto do usuário é destrutivo se sobrescrever; e um
template que o parser não reconhece não aparece no Test Explorer nem ganha
CodeLens — o ganho de produtividade da PRD-59/PRD-100 depende de o resultado ser
uma suíte válida.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-59-scaffold-suite|PRD-59]] · [[prd-100-generate-test-suite|PRD-100]]
- 🎯 Requisitos: [[prd-59-scaffold-suite|PRD-59 RF1]] · [[prd-59-scaffold-suite|PRD-59 RF2]] · [[prd-59-scaffold-suite|PRD-59 RNF1]] · [[prd-100-generate-test-suite|PRD-100 RF1]] · [[prd-100-generate-test-suite|PRD-100 RF3]] · [[prd-100-generate-test-suite|PRD-100 RF4]] · [[prd-100-generate-test-suite|PRD-100 RNF1]]
- 🧩 Código: [[COD - src-scaffold.ts]] · [[COD - commands-scaffold.ts]]
- 🧪 Testes: [[TST - scaffold.test.ts]] · [[TST - scaffoldCommands.test.ts]]
- ↩️ Referenciada por: [[Editor-integration]] · [[prd-100-generate-test-suite|PRD-100]] · [[prd-59-scaffold-suite|PRD-59]]
<!-- brain:auto:end -->
