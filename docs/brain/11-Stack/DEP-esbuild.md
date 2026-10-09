---
id: DEP-esbuild
aliases: [DEP-esbuild]
tipo: dependencia
status: ativo
titulo: "esbuild"
nome: esbuild
versao: "^0.28.2"
escopo: dev
licenca: MIT
criticidade: alta
risco: "Bundle single-file; `vscode` e `oracledb` precisam ficar externos"
alternativas: []
tags: [dependencia, dev, build]
decisoes: [ADR-004]
---

# DEP-esbuild — esbuild

## Papel no projeto

Gera o `dist/extension.js` (o `main` do manifesto): bundle CJS, `target: node22`,
com `vscode` e `oracledb` **externos** (o driver nativo não pode ser embutido).
É o artefato publicado; roda no `vscode:prepublish`.

## Riscos

- Se `external` mudar, o bundle pode tentar embutir o driver nativo e quebrar.
- Bundle single-file dificulta stack traces (sourcemap ligado).

## Alternativas

- webpack/rolldown — não adotados.

## Referências

- `package.json` · `esbuild.config.mjs`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 🧭 Decisões: [[ADR-004 - Bundling com esbuild e higiene do VSIX|ADR-004]]
<!-- brain:auto:end -->
