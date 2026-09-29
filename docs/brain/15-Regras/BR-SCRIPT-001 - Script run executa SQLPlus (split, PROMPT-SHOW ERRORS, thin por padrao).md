---
id: BR-SCRIPT-001
aliases: [BR-SCRIPT-001]
tipo: regra
titulo: Script run executa SQL*Plus (split, PROMPT/SHOW ERRORS, thin por padrão)
dominio: script
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/scriptRunner.ts:79", "src/scriptRunner.ts:397", "src/scriptRunner.ts:31"]
testes: ["src/test/integration/prd70-sqlplus.test.ts", "src/test/unit/scriptRunner.test.ts"]
prds: ["PRD-62", "PRD-70"]
tags: ["script"]
---
## Enunciado

`executeScript` divide o arquivo em statements (`splitScript`, respeitando `/` e
`;` e comentários), decodifica pelo charset do perfil (`decodeScript`) e executa
contra o banco — incluindo arquivos com diretivas SQL*Plus (header de comentários,
`PROMPT`, `SHOW ERRORS`) e DDL PL/SQL. Permanece em **thin** por padrão, salvo
`oracleClientLibDir`/thick configurado (`BR-CONN-012`).

## Pré-condições

Perfil/conexão resolvidos; arquivo com extensão suportada
(`SUPPORTED_SCRIPT_EXTS`).

## Exceções

Statement inválido aborta o script com erro apontando a linha; `SET`/diretivas
desconhecidas do SQL*Plus são toleradas/ignoradas quando não afetam o statement.

## Justificativa

Rodar scripts `.sql`/objetos dos perfis sem SQL*Plus, mantendo o comportamento dos
scripts escritos para SQL*Plus (PRD-70).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-62-run-scripts-against-profiles|PRD-62]] · [[prd-70-thick-mode-nne|PRD-70]]
- 🧩 Código: [[COD - scriptRunner.ts]]
- 🧪 Testes: [[TST - prd70-sqlplus.test.ts]] · [[TST - scriptRunner.test.ts]]
- ↩️ Referenciada por: [[prd-62-run-scripts-against-profiles|PRD-62]] · [[prd-70-thick-mode-nne|PRD-70]]
<!-- brain:auto:end -->