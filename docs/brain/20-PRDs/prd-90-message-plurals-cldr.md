---
tipo: prd
id: PRD-90
aliases: [PRD-90]
status: proposed
titulo: "Plurais (CLDR) e seleção no catálogo de mensagens"
versao: "0.18.0"
data: "2026-09-29"
autor: "Gil Cleber Barboza"
versao_titulo: "0.18.0 — Localização (formatação, plurais e paridade)"
verificado: 2026-09-29
regras: []
tags: [prd]
---

# PRD-90 — Plurais (CLDR) e seleção no catálogo de mensagens

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.17.0 |
| Arquivos afetados | `src/i18n.ts`, `src/i18nLocales.ts`, `src/statusBar.ts`, `src/quickfix.ts`, `src/commands/*.ts`, `src/test/unit/i18n.test.ts`, `docs/brain/12-I18n/`, `docs/brain/30-Decisoes/` (ADR) |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |

## 1. Resumo

As mensagens com contagem usam o truque `(s)` — `{count} problema(s)`,
`{count} breakpoint(s)` — que **não funciona** para idiomas com 3+ formas de
plural (ru, uk, pl, cs) nem para os 6 casos do árabe. Esta PRD introduz **plurais
por CLDR** no catálogo próprio (`Intl.PluralRules`) e migra essas mensagens.

## 2. Contexto e problema

Strings afetadas hoje (amostra de `src/i18nLocales.ts`):

- `{count} problema(s) de configuração encontrado(s)…`
- `{count} conexão(ões) importada(s) do SQL Developer.`
- `{count} breakpoint(s) aplicado(s); sessão pronta.`
- `{count} objetos inválidos`, `{count} linhas afetadas`, `{count} setup problem(s)`

Em **ru/pl/cs** um número pode exigir formas `one`/`few`/`many`; em **ar**, até 6
(`zero/one/two/few/many/other`). O `(s)` do inglês ignora essas regras.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Suportar **plural** no catálogo: uma chave pode ser escalar (compatível) ou um
  objeto `{ one, few, many, other, … }`.
- `t(locale, key, params)` escolhe a forma com `Intl.PluralRules(locale).select(count)`
  e faz fallback para `other`.
- Migrar todas as mensagens com `(s)` para plurais; paridade de chaves cobrada.
- Registrar a **decisão de arquitetura** (ADR): manter catálogo próprio (o
  `vscode.l10n`/`bundle.l10n.*` **não** trata plural nativamente).

**Não-objetivos**
- Não implementa gênero/seleção arbitrária neste PRD (avaliar depois).
- Não migra para `vscode.l10n` (a ADR registra o porquê).
- Não cobre RTL (PRD-92).

## 4. Requisitos

### RF1 — Formato plural no catálogo

`i18nLocales.ts` aceita `key: { one: '…', other: '…' }` (e `few`/`many`/`zero`/`two`).

### RF2 — Seleção por `Intl.PluralRules`

`t()` detecta a forma plural, seleciona a categoria do `count` e interpola.

### RF3 — Paridade e migração

Todas as chaves plurais existem em **todos** os locales (fallback `other`);
`missingCatalogKeys` e `docs-fidelity` passam a validar formas plurais.

### RF4 — ADR de localização

Nota de decisão em `30-Decisoes/` comparando catálogo próprio × `vscode.l10n`,
justificando a permanência no próprio (24 locales, fallback, testes, plural).

**Não-funcionais**
- RNF1 — Sem dependência nova (`Intl.PluralRules` nativo).
- RNF2 — Compatibilidade total com chaves escalares existentes.

## 5. Solução proposta

- `t()`: resolve o locale → se a entrada for objeto, `select(count)` → forma.
- Tipos: `type Message = string | Partial<Record<Intl.LDMLPluralRule, string>>`.
- Migração mecânica das chaves `(s)`; testes por categoria.

## 6. Configuração

Nenhuma nova.

## 7. Plano de testes

- **Unitários**: `i18n.test.ts` — `pt/en` (`one`/`other`), `ru/pl/cs`
  (`one`/`few`/`many`), `ar` (`zero`…`other`); compatibilidade escalar.
- **Paridade**: todo locale define as formas exigidas pelas suas regras CLDR
  (mínimo: as categorias que `Intl.PluralRules` pode retornar para o locale).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Tradução faltando uma forma plural | Teste exige todas as categorias possíveis do locale |
| Regressão em chaves escalares | Compatibilidade mantida + testes |
| Traduções ru/pl/cs/ar imprecisas | Glossário/revisão in-country (PRD-93) |

## 9. Rollout

- Release alvo: 0.17.0.
- Bullet no `CHANGELOG.md`; nota `12-I18n`; ADR de localização.

## 10. Critérios de aceite

- `t('pt-BR', 'status.failed', { count: 1 })` e `{ count: 2 }` corretos.
- `ru` usa `few`/`many` conforme o número; `ar` cobre as 6 categorias.
- Paridade de formas plurais verde no CI.

## 11. Questões em aberto

- Suportar **select** (gênero/contexto) junto do plural? (avaliar na ADR.)

## 12. Impacto no cérebro

Esperado criar `BR-I18N-004` (plurais via CLDR; formas exigidas por locale) com
`prds: ["PRD-90"]`, e a ADR de localização.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-92-rtl-new-locales|PRD-92]] · [[prd-93-continuous-localization-pipeline|PRD-93]]
- 🔗 Mesma versão (0.18.0): [[prd-88-locale-aware-formatting|PRD-88]] · [[prd-89-pseudo-localization-gate|PRD-89]] · [[prd-91-doc-parity-localized-distribution|PRD-91]]
- 🚀 ⬅️ release anterior: [[prd-59-scaffold-suite|PRD-59 (0.17.0)]] · ➡️ próxima release: [[prd-92-rtl-new-locales|PRD-92 (0.19.0)]]
<!-- brain:auto:end -->
