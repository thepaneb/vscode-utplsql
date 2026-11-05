---
id: BR-DOC-003
aliases: [BR-DOC-003]
tipo: regra
titulo: Marketplace usa MARKETPLACE.md gerado e README do GitHub segue como referência
dominio: documentacao
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-05
implementacao: ["docs/brain/60-README/Marketplace (README).md", "scripts/brain-build.cjs", "scripts/docs-fidelity.cjs", "scripts/marketplace-images.cjs"]
testes: ["src/test/unit/docsFidelity.test.ts", "src/test/unit/marketplaceImages.test.ts"]
prds: ["PRD-147"]
requisitos: ["PRD-147/RNF1", "PRD-147/RNF6"]
tags: [docs, marketplace]
---

## Enunciado

A página do Marketplace é uma **superfície dedicada**, gerada do vault para
`MARKETPLACE.md` e empacotada no VSIX. O `README.md` do GitHub e as 23 variantes
continuam sendo a referência completa e a paridade da PRD-91; a página curta do
Marketplace não é uma variante de locale e não entra no gate de paridade.

## Pré-condições

A nota canônica tem `tipo: readme-marketplace` e `publicar: MARKETPLACE.md`;
`brain:build` gera o arquivo. Claims, settings, links e imagens da página são
verificados pelo `docs-fidelity`.

## Exceções

A página é English-only e aponta para as variantes no GitHub; não há tradução
das 23 variantes para o Marketplace.

## Justificativa

Evita duas cópias desatualizadas e mantém a página de conversão curta, enquanto o
GitHub preserva a documentação completa.
