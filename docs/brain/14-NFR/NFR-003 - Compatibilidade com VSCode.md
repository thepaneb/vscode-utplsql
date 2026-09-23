---
id: NFR-003
tipo: nfr
titulo: "Compatibilidade com VSCode"
dominio: compatibilidade
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["compatibilidade"]
---
## Requisito

`engines.vscode ^1.88.0`; registrar CodeLens por pattern (`.pks` não tem language
ID) e usar APIs estáveis do Test Explorer.

## Justificativa

Ampliar o alcance mantendo APIs suportadas.

## Verificação

`package.json`, registro em `extension.ts`.
