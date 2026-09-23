---
id: BR-SCHEMA-001
tipo: regra
titulo: organization bifurca file tree vs schema tree; suiteMap é o lookup canônico
dominio: schema
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/testTree.ts:259", "src/testTree.ts:57", "src/testTree.ts:147", "src/state.ts:81", "src/commands/run.ts:122", "src/testTree.ts:183"]
testes: ["src/test/unit/testTree.test.ts", "src/test/unit/state.test.ts"]
tags: ["schema"]
---
## Enunciado

utplsql.organization decide a árvore: file gera buildFileTree (Schema=arquivo); schema (havendo workspace folders) gera mergeDbSuites + buildSchemaTree (Schema > Package > Suite > Test); em ambos os modos cada suite é registrada em state.suiteMap por suite:<package minúsculo>, e o lookup deve usar state.getSuiteItem() — controller.items.get() não alcança suites aninhadas no modo schema.

## Pré-condições

Refresh da árvore; modo schema exige workspace folders.

## Exceções

Com organization schema mas sem workspace folders, cai no buildFileTree; mergeDbSuites é ignorado quando discovery.source é file.

## Justificativa

No modo schema as suites ficam 3 níveis abaixo da raiz; comandos como runForUri/runAtCursor/runSingleTest dependem do suiteMap para encontrá-las.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
<!-- brain:auto:end -->
