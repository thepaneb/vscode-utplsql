---
id: BR-PARSE-006
aliases: [BR-PARSE-006]
tipo: regra
titulo: Descoberta por arquivo descarta suítes/testes disabled, vazios e ilegíveis
dominio: descoberta
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/discovery.ts:65", "src/discovery.ts:73", "src/discovery.ts:74", "src/discovery.ts:80", "src/discovery.ts:82"]
testes: ["src/test/unit/discovery.test.ts"]
prds: ["PRD-42"]
requisitos: ["PRD-42/RF1"]
tags: ["descoberta"]
---
## Enunciado

discoverWorkspace só inclui suites não-disabled com ao menos um teste não-disabled; testes disabled são filtrados; arquivo ilegível ou que falhe o parse é ignorado silenciosamente (log debug).

## Pré-condições

Padrões includePatterns e workspace folders válidos; arquivos deduplicados por URI.

## Exceções

Suíte cujo único teste é disabled não entra; suíte sem nenhum %test não entra.

## Justificativa

Mantém o Test Explorer alinhado ao que será realmente executado e impede que erros de leitura interrompam a descoberta de todo o workspace.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-42-suiteparser-annotations|PRD-42]]
- 🎯 Requisitos: [[prd-42-suiteparser-annotations|PRD-42 RF1]]
- 🧩 Código: [[COD - discovery.ts]]
- 🧪 Testes: [[TST - discovery.test.ts]]
- ↩️ Referenciada por: [[01-test-discovery]]
<!-- brain:auto:end -->
