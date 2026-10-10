---
tipo: prd
id: PRD-88
aliases: [PRD-88]
status: proposed
titulo: "Formatação sensível a locale (números e durações)"
versao: "0.21.0"
data: "2026-09-29"
autor: "Gil Cleber Barboza"
versao_titulo: "0.21.0 — Localização (formatação, plurais e paridade)"
verificado: 2026-09-29
regras: []
tags: [prd]
---

# PRD-88 — Formatação sensível a locale (números e durações)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.21.0 |
| Arquivos afetados | `src/i18n.ts`, `src/statusBar.ts`, `src/test/unit/i18n.test.ts`, `src/test/unit/statusBar.test.ts`, `CHANGELOG.md` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |

## 1. Resumo

A UI formata números com **ponto decimal fixo**: a status bar faz
`(durationMs / 1000).toFixed(1)` e renderiza `12.3s`. Isso está **errado** em 18
dos 24 locales (pt-BR, es, de, fr, it, ro, ru, uk, pl, cs, hu, bg, el, tr, id, vi
…), que usam **vírgula**. Esta PRD centraliza a formatação em `Intl.*` respeitando
o locale resolvido, **sem** tocar nos formatos de máquina.

## 2. Contexto e problema

- `src/statusBar.ts:22` — `const duration = (durationMs / 1000).toFixed(1)` e o
  texto `${duration}s` → separador decimal sempre `.`.
- Contagens interpoladas em mensagens (`status.passed`, `status.failed`,
  `quickfix.invalidObjects`, `script.rows`) não têm separador de milhar local.
- Não há **nenhum** uso de `Intl` no código (verificado), então nada é
  locale-aware hoje.

O locale efetivo já existe (`resolveLocale(setting, vscodeLanguage)` em
`src/i18n.ts`), então falta só a camada de formatação.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Helper `formatNumber(locale, value, options?)` e `formatDuration(locale, ms)`
  em `src/i18n.ts`, sobre `Intl.NumberFormat`.
- Status bar passa a exibir a duração no formato do locale (`12,3 s` em pt-BR).
- Contagens exibidas passam por `formatNumber` antes de interpolar.
- Fallback seguro: se `Intl` lançar (locale inválido), cai para `en` e depois para
  `Number.toString()`.

**Não-objetivos**
- **Não** localizar formatos de máquina: nomes de arquivo ISO
  (`src/commands/run.ts:249`), XML JUnit/Cobertura, PL/SQL e mensagens do Oracle
  permanecem neutros.
- Não altera o catálogo de mensagens nem plurais (PRD-90).
- Não usa a API `l10n` do VSCode (decisão mantida; ver PRD-90).

## 4. Requisitos

### RF1 — `formatDuration`

`formatDuration(locale, ms)` → número com 1 casa decimal no separador do locale,
mais a unidade. Ex.: `en` → `12.3 s`; `pt-BR` → `12,3 s`; `ru` → `12,3 s`.

### RF2 — `formatNumber`

`formatNumber(locale, n, opts)` delega a `Intl.NumberFormat(locale, opts)` com
`useGrouping` controlável; usado em contagens de mensagens.

### RF3 — Integração na status bar

`src/statusBar.ts` usa os helpers; nenhum `toFixed` de apresentação permanece.

**Não-funcionais**
- RNF1 — Sem dependência nova (`Intl` nativo; Node 22+).
- RNF2 — Determinismo: testes fixam o locale e o ICU do Node.

## 5. Solução proposta

- `src/i18n.ts` ganha `formatNumber`/`formatDuration` com guarda de exceção.
- `statusBar.ts` troca `toFixed` e o sufixo `s` fixo pelos helpers.
- Contagens (`status.*`, `quickfix.*`, `script.rows`) formatadas na chamada.

## 6. Configuração

Nenhuma nova (`utplsql.language` já define o locale).

## 7. Plano de testes

- **Unitários**: `i18n.test.ts` — `formatNumber`/`formatDuration` para `en`,
  `pt-BR`, `ru`; fallback com locale inválido. `statusBar.test.ts` — texto com
  vírgula em pt-BR e ponto em en.
- **Manual**: Extension Development Host com `utplsql.language` em pt-BR e ru.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `Intl` ausente/reduzido no runtime | Fallback para `en` e depois `toString()` |
| Duplicar formatação em call sites | Helpers únicos em `i18n.ts` |
| Localizar acidentalmente formato de máquina | Não-objetivo explícito + teste de que ISO/XML não muda |

## 9. Rollout

- Release alvo: 0.21.0.
- Bullet no `CHANGELOG.md`; nota de vault `12-I18n` e wiki `Internationalization`.

## 10. Critérios de aceite

- Status bar mostra `12,3 s` em pt-BR e `12.3 s` em en.
- Nenhum `toFixed` de apresentação no `src/` (fora recomputação interna).
- `npm run test:unit` verde.

## 11. Questões em aberto

- Exibir separador de milhar em contagens pequenas (ex.: `1.234`)? Avaliar por UX.

## 12. Impacto no cérebro

Esperado criar/alterar `BR-I18N-002` (formatação de números/durações é
locale-aware) com `prds: ["PRD-88"]`, `implementacao` em `src/i18n.ts` e testes.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-90-message-plurals-cldr|PRD-90]]
- 🔗 Mesma versão (0.21.0): [[prd-89-pseudo-localization-gate|PRD-89]] · [[prd-90-message-plurals-cldr|PRD-90]] · [[prd-91-doc-parity-localized-distribution|PRD-91]]
- 🚀 ⬅️ release anterior: [[prd-107-unprivileged-fixture|PRD-107 (0.20.0)]] · ➡️ próxima release: [[prd-92-rtl-new-locales|PRD-92 (0.22.0)]]
<!-- brain:auto:end -->
