---
id: NFR-002
tipo: nfr
titulo: "Compatibilidade com Node"
dominio: compatibilidade
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[ADR-004 - Bundling com esbuild e higiene do VSIX]]", "[[TPL-ESBUILD - esbuild (bundling do VSIX)]]", "[[MOC - Stack]]"]
tags: ["compatibilidade"]
---
## Requisito

`engines.node >= 22`; `.nvmrc` 24; CI testa 22 e 24.

## Justificativa

Alinhar toolchain local e CI (PRD-18/47).

## Verificação

`package.json`, `.nvmrc`, workflows.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 🔗 [[ADR-004 - Bundling com esbuild e higiene do VSIX]] · [[TPL-ESBUILD - esbuild (bundling do VSIX)]] · [[MOC - Stack]]
<!-- brain:auto:end -->
