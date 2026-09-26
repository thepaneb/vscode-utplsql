---
id: BR-CONN-014
aliases: [BR-CONN-014]
tipo: regra
titulo: Log de debug é opt-in por variável de ambiente
dominio: conexao
status: ativo
severidade: baixa
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/logger.ts:6", "src/logger.ts:12"]
testes: ["src/test/unit/logger.test.ts"]
prds: ["PRD-66"]
requisitos: ["PRD-66/RF1"]
tags: ["conexao"]
---
## Enunciado

Se logger.debug é chamado, então só emite saída quando UTPLSQL_DEBUG for exatamente o valor 1; logger.warn sempre emite e o módulo nunca lança nem deve registrar credenciais.

## Pré-condições

Módulo puro, sem dependência de vscode.

## Exceções

Qualquer valor diferente de 1 (incluindo true) mantém o debug silencioso.

## Justificativa

Diagnóstico acionável sob demanda (PRD-66 RF1) sem poluir o output do usuário em uso normal.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-66-connection-robustness-logging|PRD-66]]
- 🎯 Requisitos: [[prd-66-connection-robustness-logging|PRD-66 RF1]]
- 🧩 Código: [[COD - logger.ts]]
- 🧪 Testes: [[TST - logger.test.ts]]
- ↩️ Referenciada por: [[09-configuration]] · [[SEC-008 - Log de debug é opt-in e não registra credenciais|SEC-008]]
<!-- brain:auto:end -->
