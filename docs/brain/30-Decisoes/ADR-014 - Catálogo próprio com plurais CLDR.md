---
tipo: decisao
id: ADR-014
aliases: [ADR-014]
status: aceita
modulo: i18n
data: 2026-11-25
regras: ["BR-I18N-001", "BR-I18N-004"]
tags: [adr, i18n, locale, plural]
---

# ADR-014 - Catálogo próprio com plurais CLDR

## Contexto

A extensão mantém o catálogo de runtime em `src/i18n/locales/*.ts` (24 locales,
base pt-BR) e o manifesto em `package.nls.*.json`. Mensagens com contagem usam
`(s)` — um truque que não cobre as 3+ formas de `ru`/`uk`/`pl`/`cs` nem as 6 do
árabe. A API `vscode.l10n`/`bundle.l10n.*` é nativa para o manifesto, mas **não**
seleciona plurais.

## Decisão

1. Manter o **catálogo próprio** para mensagens de runtime (o manifesto continua
   em `package.nls.*`).
2. O valor de uma chave pode ser `string` ou um objeto de formas
   `Partial<Record<Intl.LDMLPluralRule, string>>`.
3. `t()` seleciona a forma com `Intl.PluralRules(locale).select(count)` e usa
   `other` como fallback; depois pt-BR e, por fim, a própria chave.
4. As formas exigidas pelo CLDR de cada locale são cobradas por teste e pelo
   `i18n:check` no CI.
5. Traduções iniciais das formas são **draft** até a revisão in-country;
   `Registro de locales` registra o status.

## Alternativas consideradas

- **`vscode.l10n`/`bundle.l10n.*`:** integração nativa, porém sem plural,
  sem fallback entre locales e sem controle de paridade; exigiria converter os
  24 catálogos e perder o teste atual.
- **Biblioteca i18n externa:** dependência de runtime e bundle extra.
- **Manter `(s)`:** simples, mas incorreto para a maioria dos locales.

## Consequências

- **Positivas:** plural correto por locale, fallback seguro, paridade testada e
  export/import via PRD-93.
- **Negativas / trade-offs:** mais formas para traduzir/revisar (especialmente
  `ar`); o gate de formas é rígido e exige atualização ao adicionar um locale.
- `en-gb` continua overlay de `en`; herda as formas plurais.

## Referências

- PRDs: [[prd-90-message-plurals-cldr|PRD-90]] ·
  [[prd-92-rtl-new-locales|PRD-92]]
- Código: `src/i18n.ts`, `src/i18n/locales/`, `scripts/i18n-check.cjs`
- [[MOC - I18n]] · [[NFR-006 - Internacionalização]] · [[ADR-007 - i18n via package.nls com 23 locales|ADR-007]]
