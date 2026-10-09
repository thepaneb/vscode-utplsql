---
id: BR-DEP-001
aliases: [BR-DEP-001]
tipo: regra
titulo: Runtime deps em dependencies (empacotadas) e cada dep direta relevante tem nota DEP-*
dominio: empacotamento
status: ativo
severidade: baixa
interno: true
fonte: convencao
verificado: 2026-10-09
implementacao: ["package.json"]
testes: []
relacionado: ["[[DEP-oracledb - node-oracledb]]", "[[DEP-fast-xml-parser]]", "[[ADR-004 - Bundling com esbuild e higiene do VSIX]]"]
tags: ["empacotamento", "dependencias"]
---
## Enunciado

Dependências usadas em **runtime** ficam em `dependencies` (empacotadas no VSIX;
`vscode` e `oracledb` **externos** no bundle) — o restante em `devDependencies`.
Cada dependência direta relevante tem uma nota `DEP-*` no cérebro com papel,
versão, licença e risco.

## Pré-condições

`package.json`; `esbuild.config.mjs` (lista de `external`); `.vscodeignore`.

## Justificativa

Separa o que chega ao usuário do que é só de desenvolvimento e mantém o
inventário/risco das dependências rastreável no grafo do cérebro.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 🧩 Código: [[COD - package.json]]
- 🔗 [[DEP-oracledb - node-oracledb]] · [[DEP-fast-xml-parser]] · [[ADR-004 - Bundling com esbuild e higiene do VSIX]]
- ↩️ Referenciada por: [[10-development-tooling]] · [[DEP-fast-xml-parser]] · [[DEP-oracledb - node-oracledb|DEP-oracledb]] · [[TPL-FASTXML - fast-xml-parser|TPL-FASTXML]] · [[TPL-ORACLEDB - node-oracledb|TPL-ORACLEDB]]
<!-- brain:auto:end -->
