---
id: BR-PKG-002
aliases: [BR-PKG-002]
tipo: regra
titulo: VSIX publica apenas o README do Marketplace
dominio: packaging
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-05
implementacao: ["package.json", "scripts/package-target.cjs", ".vscodeignore"]
testes: ["src/test/unit/packageTarget.test.ts", "src/test/unit/vsixIgnore.test.ts"]
prds: ["PRD-147"]
requisitos: ["PRD-147/RNF7"]
tags: [packaging, marketplace]
---

## Enunciado

`npm run package` e `package:target` usam `vsce --readme-path MARKETPLACE.md
--githubBranch main`. O VSIX contém `extension/readme.md` com o conteúdo do
Marketplace e **não** contém `README.md`/`README.*.md` do GitHub.

## Pré-condições

`MARKETPLACE.md` existe (gerado do vault); `.vscodeignore` exclui os READMEs do
GitHub; as imagens relativas `images/marketplace-*` estão na `main` antes do
publish.

## Exceções

O `README.md` do GitHub continua versionado e íntegro; ele só não entra no
pacote.

## Justificativa

Mantém o pacote enxuto e garante que a página exibida no Marketplace seja a
vitrine de conversão, sem duplicar as 23 variantes do GitHub.
