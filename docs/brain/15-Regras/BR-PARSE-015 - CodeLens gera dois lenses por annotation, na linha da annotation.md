---
id: BR-PARSE-015
aliases: [BR-PARSE-015]
tipo: regra
titulo: CodeLens gera dois lenses por annotation, na linha da annotation
dominio: parser
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/codelens.ts:80", "src/codelens.ts:81", "src/codelens.ts:18", "src/codelens.ts:44", "src/codelens.ts:93", "src/codelens.ts:107"]
testes: ["src/test/unit/codelens.test.ts"]
prds: ["PRD-24"]
requisitos: ["PRD-24/RF2", "PRD-24/RF3"]
tags: ["parser", "ui"]
---
## Enunciado

provideCodeLenses retorna vazio se codeLens.enabled estiver desligado ou se o fileName não terminar em .pks; caso contrário gera dois lenses por annotation (Executar e Executar com Cobertura), posicionando a suíte na linha do %suite e o teste na linha do %test (pendingLine); teste sem PROCEDURE seguinte é ignorado.

## Pré-condições

Arquivo .pks com CREATE PACKAGE e %suite; parseCodeLensItems.

## Exceções

Arquivos .pkb/.sql não recebem CodeLens; %test órfão não gera lens; sem CREATE PACKAGE parseCodeLensItems retorna vazio.

## Justificativa

O lens deve ficar sobre a annotation (não a procedure) para o usuário executar a partir de onde foi declarado.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-24-codelens-integration|PRD-24]]
- 🎯 Requisitos: [[prd-24-codelens-integration|PRD-24 RF2]] · [[prd-24-codelens-integration|PRD-24 RF3]]
- ↩️ Referenciada por: [[05-ux-components]]
<!-- brain:auto:end -->
