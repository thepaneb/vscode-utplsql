---
id: NFR-003
aliases: [NFR-003]
tipo: nfr
titulo: "Compatibilidade com VSCode"
dominio: compatibilidade
status: ativo
verificado: 2026-09-23
implementacao: ["package.json:11", "package.json:823"]
testes: ["src/test/unit/docsFidelity.test.ts"]
regras: []
relacionado: ["[[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]]", "[[MOC - Arquitetura]]"]
tags: ["compatibilidade"]
---
## Requisito

`engines.vscode ^1.88.0`; registrar CodeLens por pattern (`.pks` não tem language
ID) e usar APIs estáveis do Test Explorer.

## Justificativa

Ampliar o alcance mantendo APIs suportadas.

## Verificação

`package.json`, registro em `extension.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 🧩 Código: [[COD - package.json]]
- 🧪 Testes: [[TST - docsFidelity.test.ts]]
- 🔗 [[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]] · [[MOC - Arquitetura]]
- ↩️ Referenciada por: [[09-configuration]] · [[TPL-VSCODE-API - API do VS Code usada|TPL-VSCODE-API]]
<!-- brain:auto:end -->
