---
tipo: prd
id: PRD-88
aliases: [PRD-88]
status: approved
titulo: "Formatação sensível a locale (números e durações)"
versao: "0.22.0"
data: "2026-09-29"
autor: "Gil Cleber Barboza"
versao_titulo: "0.22.0 — Localização completa"
verificado: 2026-11-25
regras: []
docs: ["CHANGELOG", "wiki/Internationalization.md"]
tags: [prd]
---

# PRD-88 — Formatação sensível a locale (números e durações)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.22.0 |
| Arquivos afetados | `src/i18n.ts`, `src/statusBar.ts`, `src/state.ts`, `src/results.ts`, `src/testTree.ts`, `src/test/unit/i18n.test.ts`, `src/test/unit/statusBar.test.ts`, `src/test/unit/state.test.ts` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |

## 1. Resumo

A UI formata números com **ponto decimal fixo**: a status bar faz
`(durationMs / 1000).toFixed(1)` e renderiza `12.3s`. Isso está **errado** em 17
dos 24 locales (pt-BR, es, de, fr, it, ro, ru, uk, pl, cs, hu, bg, el, tr, id, sr,
vi), que usam **vírgula**. Esta PRD centraliza a formatação em `Intl.*` respeitando
o locale resolvido, **sem** tocar nos formatos de máquina.

## 2. Contexto e problema

- `src/statusBar.ts:23` — `const duration = (durationMs / 1000).toFixed(1)` e o
  texto `${duration}s` → separador decimal sempre `.`.
- `src/state.ts:25` — o sufixo de duração do label do Test Explorer
  (`withDurationSuffix`) repete o `toFixed(1)`, então o problema não é só da
  status bar.
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
- Status bar e label do Test Explorer exibem a duração no formato do locale
  (`12,3 s` em pt-BR; `850 ms` abaixo de 1 s).
- Contagens `count`/`total` passam por `formatNumber` ao interpolar em `t()`.
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
mais a unidade separada por espaço. Ex.: `en` → `12.3 s`; `pt-BR` → `12,3 s`;
`ru` → `12,3 s`; abaixo de 1 s mantém `850 ms`.

### RF2 — `formatNumber`

`formatNumber(locale, n, opts)` delega a `Intl.NumberFormat(locale, opts)` com
`useGrouping` controlável. `t()` formata `count` e `total` automaticamente
(números usados em prosa), mantendo os demais parâmetros técnicos intactos.

### RF3 — Integração na UI

`src/statusBar.ts` e o sufixo de duração do Test Explorer (`src/state.ts`, usado
por `results.ts`/`testTree.ts`) usam os helpers; nenhum `toFixed` de apresentação
permanece. O label passa a aceitar o locale em `withDurationSuffix(...)`, e
`DURATION_SUFFIX_RE` reconhece vírgula e ponto.

**Não-funcionais**
- RNF1 — Sem dependência nova (`Intl` nativo; Node 24).
- RNF2 — Determinismo: testes fixam o locale e o ICU do Node; usar
  `formatToParts` para não depender de NBSP.

## 5. Solução proposta

- `src/i18n.ts` ganha `formatNumber`/`formatDuration` com guarda de exceção e
  formata `count`/`total` dentro de `t()`.
- O `formatDuration` de apresentação sai de `state.ts` para `i18n.ts`;
  `withDurationSuffix` recebe o locale (ou a duração já formatada) e
  `state.ts` continua puro.
- `statusBar.ts`, `results.ts` e `testTree.ts` passam o locale resolvido.

## 6. Configuração

Nenhuma nova (`utplsql.language` já define o locale).

## 7. Plano de testes

- **Unitários**: `i18n.test.ts` — `formatNumber`/`formatDuration` para `en`,
  `pt-BR`, `ru`; fallback com locale inválido; `t()` formatando `count`/`total`.
  `statusBar.test.ts` — texto com vírgula em pt-BR e ponto em en.
  `state.test.ts` — `withDurationSuffix` com locale e troca idempotente.
- **Manual**: Extension Development Host com `utplsql.language` em pt-BR e ru.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `Intl` ausente/reduzido no runtime | Fallback para `en` e depois `toString()` |
| Duplicar formatação em call sites | Helpers únicos em `i18n.ts` |
| Localizar acidentalmente formato de máquina | Não-objetivo explícito + teste de que ISO/XML não muda |

## 9. Rollout

- Release alvo: 0.22.0.
- Bullet no `CHANGELOG.md`; nota de vault `12-I18n` e wiki `Internationalization`.

## 10. Critérios de aceite

- Status bar mostra `12,3 s` em pt-BR e `12.3 s` em en.
- Nenhum `toFixed` de apresentação no `src/` (fora recomputação interna).
- `npm run test:unit` verde.

## 11. Decisões (2026-11-25)

- **Sem grouping na status bar**: o contador compacto `passed/total` não usa
  separador de milhar (largura); contagens em prosa (`count`, `total`) usam o
  grouping do locale.
- **`t()` formata `count`/`total`**, não o call site: os demais parâmetros
  numéricos (`line`, `ms`, `index`) ficam crus para não localizar dados técnicos.
- Duração mantém `ms` abaixo de 1 s e `s` acima, sempre com o separador do
  locale; o espaço antes da unidade é fixo.
- `state.ts` continua puro: recebe o locale, não importa `vscode`.

## 12. Impacto no cérebro

Esperado criar/alterar `BR-I18N-002` (formatação de números/durações é
locale-aware) com `prds: ["PRD-88"]`, `implementacao` em `src/i18n.ts` e testes.

## 13. Impacto nas docs

- `CHANGELOG` — bullet da formatação locale-aware (PRD-88).
- `wiki/Internationalization.md` — exemplos de `formatDuration`/`formatNumber` e
  nota de que formatos de máquina não mudam (PRD-88).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-90-message-plurals-cldr|PRD-90]]
- 🔗 Mesma versão (0.22.0): [[prd-89-pseudo-localization-gate|PRD-89]] · [[prd-90-message-plurals-cldr|PRD-90]] · [[prd-91-doc-parity-localized-distribution|PRD-91]] · [[prd-92-rtl-new-locales|PRD-92]] · [[prd-93-continuous-localization-pipeline|PRD-93]] · [[prd-115-split-i18n-locales|PRD-115]]
- 🚀 ⬅️ release anterior: [[prd-139-state-store-slicing-lru|PRD-139 (0.21.0)]] · ➡️ próxima release: [[prd-60-branch-coverage-investigation|PRD-60 (0.23.0)]]
<!-- brain:auto:end -->
