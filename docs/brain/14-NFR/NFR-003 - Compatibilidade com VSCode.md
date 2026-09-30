---
id: NFR-003
aliases: [NFR-003]
tipo: nfr
titulo: "Compatibilidade com VSCode"
dominio: compatibilidade
status: ativo
verificado: 2026-09-29
implementacao: ["package.json:11", "package.json:12", "package.json:822", "package.json:824"]
testes: ["src/test/unit/docsFidelity.test.ts"]
regras: []
relacionado: ["[[TPL-VSCODE-API - API do VS Code usada]]", "[[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]]", "[[MOC - Arquitetura]]"]
tags: ["compatibilidade"]
---
## Requisito

`engines.vscode ^1.101.0` — primeiro VS Code com **Node 22** no Extension Host
(`.nvmrc` da tag `1.101.0`). O runtime da extensão é o **Node embutido no VS
Code**, não o do dev/CI; por isso `engines.node >=22`, `@types/node ^22` e o
`esbuild target node22` devem casar com o Node do host (tabela em
[[TPL-VSCODE-API - API do VS Code usada]]). Registrar CodeLens por pattern
(`.pks` não tem language ID) e usar APIs estáveis do Test Explorer.

## Justificativa

Ampliar o alcance mantendo APIs suportadas **e um runtime ainda suportado**: o
piso anterior (1.88) roda **Node 18.18, EOL desde abr/2025**. O Node 22 é o LTS
mais antigo em suporte (EOL abr/2027).

## Verificação

`package.json` (engines + types), `esbuild.config.mjs` (target) e o
`docs-fidelity` (checa `@types/vscode` == piso e a coerência com o Node do host).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 🧩 Código: [[COD - package.json]]
- 🧪 Testes: [[TST - docsFidelity.test.ts]]
- 🔗 [[TPL-VSCODE-API - API do VS Code usada]] · [[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]] · [[MOC - Arquitetura]]
- ↩️ Referenciada por: [[09-configuration]] · [[BR-PLAT-001 - Piso de VS Code e runtime Node do host sao coerentes|BR-PLAT-001]] · [[TPL-VSCODE-API - API do VS Code usada|TPL-VSCODE-API]]
<!-- brain:auto:end -->
