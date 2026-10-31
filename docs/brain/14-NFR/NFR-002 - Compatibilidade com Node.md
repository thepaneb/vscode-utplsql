---
id: NFR-002
aliases: [NFR-002]
tipo: nfr
titulo: "Compatibilidade com Node"
dominio: compatibilidade
status: ativo
verificado: 2026-10-31
implementacao: ["package.json:12", "package.json:1022", "esbuild.config.mjs:9", ".github/workflows/ci.yml"]
testes: ["src/test/unit/docsFidelity.test.ts"]
regras: ["BR-PLAT-001"]
relacionado: ["[[ADR-004 - Bundling com esbuild e higiene do VSIX]]", "[[TPL-ESBUILD - esbuild (bundling do VSIX)]]", "[[MOC - Stack]]"]
requisitos: ["PRD-18/RNF1", "PRD-47/RF1", "PRD-47/RF2", "PRD-127/RF2"]
tags: ["compatibilidade"]
---
## Requisito

`engines.node >= 24`; `.nvmrc` 24; CI testa **24 e 26** (o 26 é eixo de
toolchain, não o runtime do host). O runtime da extensão é o Node do Extension
Host (VS Code 1.125 / Node 24.15).

## Justificativa

Alinhar o toolchain local, o runtime do host (PRD-127) e a próxima LTS (PRD-47),
sem manter o Node 22, que deixou de ser o piso.

## Verificação

`package.json`, `.nvmrc`, `esbuild.config.mjs` e `.github/workflows/ci.yml`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 📐 Regras: [[BR-PLAT-001 - Piso de VS Code e runtime Node do host sao coerentes|BR-PLAT-001]]
- 🎯 Requisitos: [[prd-18-engine-node-ci|PRD-18 RNF1]] · [[prd-47-node-26-toolchain|PRD-47 RF1]] · [[prd-47-node-26-toolchain|PRD-47 RF2]] · [[prd-127-vscode-floor-1-125|PRD-127 RF2]]
- 🧩 Código: [[COD - package.json]] · [[COD - esbuild.config.mjs]] · [[COD - ci.yml]]
- 🧪 Testes: [[TST - docsFidelity.test.ts]]
- 🔗 [[ADR-004 - Bundling com esbuild e higiene do VSIX]] · [[TPL-ESBUILD - esbuild (bundling do VSIX)]] · [[MOC - Stack]]
- ↩️ Referenciada por: [[09-configuration]]
<!-- brain:auto:end -->
