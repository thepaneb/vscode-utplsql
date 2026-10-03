---
id: BR-PLAT-001
aliases: [BR-PLAT-001]
tipo: regra
titulo: Piso de VS Code e runtime Node do host são coerentes
dominio: plataforma
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-29
implementacao: ["package.json:11", "package.json:12", "package.json:822", "package.json:824", "esbuild.config.mjs:9", "scripts/docs-fidelity.cjs:283"]
testes: ["src/test/unit/docsFidelity.test.ts"]
prds: ["PRD-94"]
requisitos: ["PRD-94/RF1", "PRD-94/RF2", "PRD-94/RNF1", "PRD-94/RNF2"]
relacionado: ["[[NFR-003 - Compatibilidade com VSCode]]", "[[TPL-VSCODE-API - API do VS Code usada]]"]
tags: ["plataforma"]
---
## Enunciado

A extensão roda no **Node embutido no VS Code** (Extension Host). Portanto:

- `engines.vscode` define o piso, e o Node do host dessa versão é o **runtime
  real** da extensão (não o Node do dev/CI);
- `@types/vscode` deve ser **exatamente** o piso (para o compilador recusar API
  acima dele);
- `engines.node`, `@types/node` e o `esbuild target` devem **casar com o Node do
  host** do piso (mapa VS Code → Node em
  [[TPL-VSCODE-API - API do VS Code usada]]).

## Pré-condições

`package.json` com `engines.vscode`; a checagem ignora fixtures sem `engines`.

## Exceções

Versão do piso **não mapeada** no `VSCODE_HOST_NODE` → a coerência é pulada (o
mapa deve ser atualizado ao subir o piso).

## Justificativa

Evitar duas falhas silenciosas: (a) compilar contra tipos mais novos que o piso e
quebrar no host mínimo; (b) manter o piso num VS Code cujo Node já está **EOL**.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-94-vscode-floor-1-101|PRD-94]]
- 🎯 Requisitos: [[prd-94-vscode-floor-1-101|PRD-94 RF1]] · [[prd-94-vscode-floor-1-101|PRD-94 RF2]] · [[prd-94-vscode-floor-1-101|PRD-94 RNF1]] · [[prd-94-vscode-floor-1-101|PRD-94 RNF2]]
- 🧩 Código: [[COD - package.json]] · [[COD - esbuild.config.mjs]] · [[COD - docs-fidelity.cjs]]
- 🧪 Testes: [[TST - docsFidelity.test.ts]]
- 🔗 [[NFR-003 - Compatibilidade com VSCode]] · [[TPL-VSCODE-API - API do VS Code usada]]
- ↩️ Referenciada por: [[Installation-and-requirements]] · [[NFR-002 - Compatibilidade com Node|NFR-002]] · [[NFR-003 - Compatibilidade com VSCode|NFR-003]] · [[prd-94-vscode-floor-1-101|PRD-94]]
<!-- brain:auto:end -->
