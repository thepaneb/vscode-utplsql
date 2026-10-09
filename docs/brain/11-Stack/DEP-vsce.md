---
id: DEP-vsce
aliases: [DEP-vsce]
tipo: dependencia
status: ativo
titulo: "@vscode/vsce"
nome: "@vscode/vsce"
versao: "^4.0.0"
escopo: dev
licenca: MIT
criticidade: media
risco: "Empacotamento depende do `.vscodeignore`; publicação só via GitHub release"
alternativas: []
tags: [dependencia, dev, empacotamento]
---

# DEP-vsce — @vscode/vsce

## Papel no projeto

Empacota o `.vsix` (`npm run package`, `package:target`). A **publicação** é
feita exclusivamente pelo workflow `publish.yml` (GitHub release); `npm run
publish` local é bloqueado.

## Riscos

- O conteúdo do `.vsix` depende do `.vscodeignore` (exclui `src/`, `scripts/`,
  `.env*`, etc.) — um erro pode vazar fonte ou faltar um artefato.

## Alternativas

- Nenhuma prática (padrão VSCode).

## Referências

- `package.json` · `.vscodeignore` · `scripts/package-target.cjs`
