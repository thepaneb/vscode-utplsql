---
id: NFR-003
aliases: [NFR-003]
tipo: nfr
titulo: "Compatibilidade com VSCode"
dominio: compatibilidade
status: ativo
verificado: 2026-10-31
implementacao: ["package.json:11", "package.json:1024", "esbuild.config.mjs:9", "scripts/docs-fidelity.cjs:330"]
testes: ["src/test/unit/docsFidelity.test.ts"]
regras: ["BR-PLAT-001"]
relacionado: ["[[TPL-VSCODE-API - API do VS Code usada]]", "[[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]]", "[[MOC - Arquitetura]]"]
tags: ["compatibilidade"]
---
## Requisito

`engines.vscode ^1.125.0` — primeiro VS Code estável com **Node 24** no
Extension Host **e** `@types/vscode` publicado (a 1.123/1.124 têm Node 24, mas
não têm tipos no npm). O runtime da extensão é o **Node embutido no VS Code**,
não o do dev/CI; por isso `engines.node >=24`, `@types/node ^24` e o `esbuild
target node24` devem casar com o Node do host (tabela em
[[TPL-VSCODE-API - API do VS Code usada]]). Registrar CodeLens por pattern
(`.pks` não tem language ID) e usar APIs estáveis do Test Explorer.

## Justificativa

Manter o runtime do host em um LTS suportado: o Node 24 é o LTS atual (EOL
abr/2028) e o piso anterior (1.101/Node 22) já está um LTS atrás do host.

## Verificação

`package.json` (engines + types), `esbuild.config.mjs` (target) e o
`docs-fidelity` (checa `@types/vscode` == piso e a coerência com o Node do host).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 📐 Regras: [[BR-PLAT-001 - Piso de VS Code e runtime Node do host sao coerentes|BR-PLAT-001]]
- 🧩 Código: [[COD - package.json]] · [[COD - esbuild.config.mjs]] · [[COD - docs-fidelity.cjs]]
- 🧪 Testes: [[TST - docsFidelity.test.ts]]
- 🔗 [[TPL-VSCODE-API - API do VS Code usada]] · [[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]] · [[MOC - Arquitetura]]
- ↩️ Referenciada por: [[09-configuration]] · [[BR-PLAT-001 - Piso de VS Code e runtime Node do host sao coerentes|BR-PLAT-001]] · [[TPL-VSCODE-API - API do VS Code usada|TPL-VSCODE-API]]
<!-- brain:auto:end -->
