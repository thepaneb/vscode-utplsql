---
tipo: nota
status: ativo
modulo: i18n
data: 2026-11-25
verificado: 2026-11-25
tags: [i18n, locale, politica]
---

# Política de locales

Regras para **manter, adicionar ou encerrar** um locale, alinhadas ao registro
([[Registro de locales]]) e ao gate de paridade (PRD-91).

## Manter

- Paridade verde: catálogo (24 chaves-base), `package.nls.<locale>.json`,
  `README.<locale>.md` e links de idioma.
- Revisor ativo no registro (mantenedor ou in-country).
- Adoção compatível com o custo: o locale aparece no painel do Marketplace ou
  tem demanda recorrente (issues/feedback).

## Adicionar

- Demanda comprovada (instalações/região ou pedido recorrente) **e** revisor
  disposto a manter as 4 superfícies.
- Orçamento de tradução/revisão aprovado; entra como `beta` no registro até a
  primeira revisão in-country, sem bloquear a release.
- Requisitos técnicos: `LOCALE_CODES`, catálogo, manifesto, README, switcher,
  enum de `utplsql.language` e linha no registro.

## Encerrar (ou arquivar)

- Sem revisor por **duas releases** e adoção baixa (sem instalações relevantes
  no período), ou custo de manutenção desproporcional.
- Fluxo: marcar `arquivado` no registro, remover catálogo/manifesto/README e a
  entrada do enum; manter o histórico no git e no CHANGELOG.
- Locales `beta` sem revisão por uma release são reavaliados (promover ou
  arquivar).

## Priorização

1. Locales com revisor ativo e paridade verde.
2. Locales `beta` com demanda e revisor em formação.
3. Locales sem revisor: não recebem features novas; correções de paridade
   continuam obrigatórias até o arquivamento.

> A revisão in-country e o fluxo de export/import entram na PRD-93; esta
> política é o critério de decisão, não o processo de tradução.

## Conexões

- 🗺️ [[MOC - I18n]]
- 📄 [[prd-91-doc-parity-localized-distribution|PRD-91]]
- 🗂️ [[Registro de locales]]
