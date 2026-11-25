<!-- GENERATED FROM docs/brain/20-PRDs/prd-90-message-plurals-cldr.md — DO NOT EDIT -->

# PRD-90 — Plurais (CLDR) e seleção no catálogo de mensagens

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.22.0 |
| Arquivos afetados | `src/i18n.ts`, `src/i18n/locales/*.ts`, `src/statusBar.ts`, `src/quickfix.ts`, `src/commands/*.ts`, `src/test/unit/i18n.test.ts`, `docs/brain/12-I18n/`, `docs/brain/30-Decisoes/` (ADR + revisão do ADR-007) |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |

## 1. Resumo

As mensagens com contagem usam o truque `(s)` — `{count} problema(s)`,
`{count} breakpoint(s)` — que **não funciona** para idiomas com 3+ formas de
plural (ru, uk, pl, cs) nem para os 6 casos do árabe. Esta PRD introduz **plurais
por CLDR** no catálogo próprio (`Intl.PluralRules`) e migra essas mensagens.

## 2. Contexto e problema

As **10 chaves com `{count}`** do catálogo base (após a PRD-115, em
`src/i18n/locales/*.ts`) incluem:

- `ext.validate.problems` — `{count} problema(s)…`
- `ext.sqlDev.import.ok` — `{count} conexão(ões) importada(s)…`
- `debug.breakpointsApplied` — `{count} breakpoint(s) aplicado(s)…`
- `quickfix.invalidObjects`/`stillInvalid`, `script.rows`, `status.passed`/
  `failed`/`errored`/`skipped`

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

Cada catálogo em `src/i18n/locales/<locale>.ts` aceita
`key: { one: '…', other: '…' }` (e `few`/`many`/`zero`/`two`), mantendo
`string` para as chaves escalares.

### RF2 — Seleção por `Intl.PluralRules`

`t()` detecta a forma plural, seleciona a categoria do `count` bruto e interpola
o número já formatado pelo locale (PRD-88); fallback para `other`.

### RF3 — Paridade e migração

Todas as chaves plurais existem em **todos** os locales (fallback `other`);
`missingCatalogKeys` e o teste de paridade passam a validar as formas plurais
exigidas pelo CLDR de cada locale.

### RF4 — ADR de localização

Nota de decisão em `30-Decisoes/` comparando catálogo próprio × `vscode.l10n`,
justificando a permanência no próprio (24 locales, fallback, testes, plural) e
atualizando o **ADR-007** (que ainda fala em 23 locales).

**Não-funcionais**
- RNF1 — Sem dependência nova (`Intl.PluralRules` nativo).
- RNF2 — Compatibilidade total com chaves escalares existentes.

## 5. Solução proposta

- `t()`: resolve o locale → se a entrada for objeto, `select(count)` → forma
  (fallback `other`), depois interpola com o número formatado.
- Tipos: `type Message = string | Partial<Record<Intl.LDMLPluralRule, string>>`;
  `Catalog = Record<string, Message>`.
- Migração mecânica das **10 chaves com `{count}`**; testes por categoria e por
  locale (incluindo `ru`, `pl`, `cs` e, na PRD-92, `ar`).

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

- Release alvo: 0.22.0.
- Bullet no `CHANGELOG.md`; nota `12-I18n`; ADR de localização.

## 10. Critérios de aceite

- `t('pt-BR', 'status.failed', { count: 1 })` e `{ count: 2 }` corretos.
- `ru` usa `few`/`many` conforme o número; `ar` cobre as 6 categorias.
- Paridade de formas plurais verde no CI.

## 11. Decisões (2026-11-25)

- **Sem `select`** (gênero/contexto) nesta release; o formato do catálogo fica
  restrito a formas plurais e a ADR registra a decisão.
- Forma **shorthand** `{ one, few, many, other }` (sem envelope `plural`) para
  minimizar o churn; se `select` for necessário depois, entra por PRD própria.
- Fallback da forma: categoria do locale → `other` → pt-BR → chave.
- Aplicar **depois da PRD-115** (um arquivo por locale) para evitar conflito nos
  24 catálogos.
- `BR-I18N-001` passa a mencionar a seleção plural no `t()`.
- As formas são geradas como **draft** a partir da tradução existente; a revisão
  in-country fica registrada no `Registro de locales` e não bloqueia a release.

## 12. Impacto no cérebro

Criada a regra `BR-I18N-004` (plurais via CLDR; formas exigidas por locale) com
`prds: ["PRD-90"]` e a `ADR-014` (catálogo próprio com plurais); o `ADR-007` foi
atualizado. As formas iniciais são **draft** até a revisão in-country.

## 13. Impacto nas docs

- `CHANGELOG` — bullet dos plurais CLDR (PRD-90).
- `wiki/Internationalization.md` — nota sobre formas plurais por locale e a ADR
  de localização (PRD-90).
