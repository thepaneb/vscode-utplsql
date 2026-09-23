---
tipo: decisao
status: aceita
modulo: i18n
data: 2026-09-23
tags: [adr, i18n, nls, locales]
---

# ADR-007 - i18n via package.nls com 23 locales

## Contexto

A extensão precisava acompanhar o idioma de exibição do VSCode para strings de UI
(comandos, títulos, mensagens) e para o conteúdo documental (README, wiki), sem
duplicar lógica nem introduzir dependência de runtime i18n.

## Decisão

1. **Strings de UI via `package.nls.*.json`** (mecanismo nativo do VSCode),
   referenciadas como `%nls.*%` no `package.json` — sem biblioteca i18n.
2. **Seguir o display language** por padrão (`utplsql.language: auto`), com
   override explícito.
3. **Documentação localizada**: `README.<locale>.md` (23 variantes) e wiki pt-BR/en.
4. **Camada `LOC-*`** (gerada) inventaria os locales a partir dos `package.nls`.

## Alternativas consideradas

- **`vscode-nls` + bundles:** mais flexível para runtime, porém dependência extra e
  complexidade de bundling.
- **Só inglês:** menor custo, mas perde alcance internacional.
- **Traduzir só o README:** UI continuaria em inglês.

## Consequências

- **Positivas:** zero dependência i18n; integração nativa; 24 locales de UI + 23
  READMEs.
- **Negativas / trade-offs:** manter 23 traduções sincronizadas (risco de
  defasagem); a documentação é **gerada** do vault (`60-README`, `70-Wiki`), então
  a tradução é feita na nota do vault.

## Referências

- PRDs: [[prd-49-internacionalizacao|PRD-49]] ·
  [[prd-63-diagram-i18n|PRD-63]]
- Código: `src/i18n.ts`, `src/i18nLocales.ts`, `package.nls.*.json`
- [[MOC - I18n]] · [[NFR-006 - Internacionalização]]
