---
tipo: prd
id: PRD-93
aliases: [PRD-93]
status: proposed
titulo: "Pipeline de localização contínua (glossário, TM e revisão)"
versao: "0.22.0"
data: "2026-09-29"
autor: "Gil Cleber Barboza"
versao_titulo: "0.22.0 — Localização (RTL, novos locales e pipeline)"
verificado: 2026-09-29
regras: []
tags: [prd]
---

# PRD-93 — Pipeline de localização contínua (glossário, TM e revisão)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.22.0 |
| Arquivos afetados | `scripts/i18n-export.cjs`, `scripts/i18n-apply.cjs` (novos), `docs/brain/12-I18n/` (glossário + donos), `.opencode/skills/` (workflow), `.github/workflows/ci.yml` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |

## 1. Resumo

Com 24 locales (e `ar`/`he` na 0.22.0), a manutenção manual não escala. Esta PRD
define um **pipeline de localização contínua**: exportar/importar catálogos com
**translation memory** e **glossário**, dono/revisor por locale, e gates de
qualidade no CI — via scripts próprios e, opcionalmente, um TMS.

## 2. Contexto e problema

- Os catálogos vivem em `src/i18nLocales.ts` + `package.nls.*.json`; adicionar uma
  string exige editar 24 lugares (ou 48, contando README).
- Não há **glossário** para termos críticos (`utPLSQL`, `PL/SQL`, `V$SQL`, `thin`,
  `DBMS_DEBUG`, `wallet`) — risco de traduções divergentes.
- Não há **memória de tradução**: a mesma frase é retraduzida do zero.
- Não há dono/revisor por locale nem processo de revisão in-country.

## 3. Objetivos / Não-objetivos

**Objetivos**
- **Formatos de intercâmbio**: `scripts/i18n-export.cjs` gera arquivos por locale
  (ex.: JSON/CSV/`xliff`); `i18n-apply.cjs` reimporta e valida.
- **Glossário** versionado no vault (`12-I18n/glossario`) e checado em tradução.
- **Registro de donos/revisores** por locale (integra PRD-91).
- **Gate de qualidade**: paridade, plurais (PRD-90), pseudo-loc (PRD-89) e
  glossário no CI.
- **Opção TMS** documentada (Crowdin/Lokalise/Smartling) com o fluxo equivalente.

**Não-objetivos**
- Não contrata tradução automática de baixa qualidade como fonte.
- Não muda o mecanismo de runtime (catálogo próprio permanece — ADR do PRD-90).

## 4. Requisitos

### RF1 — Export/Import

`i18n-export` produz um artefato por locale com chaves, formas plurais e contexto;
`i18n-apply` valida e grava de volta em `i18nLocales.ts`/`package.nls.*` sem
quebrar formatação.

### RF2 — Glossário

`docs/brain/12-I18n/glossario` lista termos e traduções preferidas por locale;
`docs-fidelity` avisa quando um termo aparece divergente.

### RF3 — Donos e revisão

Registro de dono/revisor por locale; fluxo de revisão in-country documentado.

### RF4 — Integração contínua

Job/etapa no CI roda os gates (paridade, plural, pseudo, glossário) e reporta
locales pendentes de revisão.

**Não-funcionais**
- RNF1 — Nenhum segredo/chave de TMS no repositório (uso local/CI gated).
- RNF2 — `i18n-apply` idempotente e determinístico (diferença mínima).

## 5. Solução proposta

- Scripts Node puros (`scripts/i18n-export.cjs`, `i18n-apply.cjs`) reusando o
  parser de catálogo do `i18n.ts`.
- Glossário e registro em notas do vault.
- Skill interna de localização ou extensão da `docs-fidelity`.

## 6. Configuração

Nenhuma setting de extensão; env/CI para TMS quando adotado.

## 7. Plano de testes

- **Unitários**: `i18nExport.test.ts`/`i18nApply.test.ts` com fixtures
  (round-trip sem perda; forma plural preservada).
- **CI**: gates de paridade/plural/pseudo/glossário.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `i18n-apply` corromper o catálogo | Round-trip determinístico + testes |
| Tradução sem contexto | Export com contexto/comentário; glossário |
| Complexidade de TMS para 1 mantenedor | TMS opcional; scripts próprios como base |
| Vazamento de credencial de TMS | Fora do repo; gated no CI |

## 9. Rollout

- Release alvo: 0.22.0.
- Bullet no `CHANGELOG.md`; skill/workflow documentado; wiki `Contributing`.

## 10. Critérios de aceite

- Export/import round-trip sem perda em todos os locales.
- Glossário aplicado e validado no CI.
- Registro de donos/revisores preenchido.

## 11. Questões em aberto

- Adotar TMS neste ciclo ou manter scripts próprios? (decisão de custo.)

## 12. Impacto no cérebro

Esperado criar `BR-I18N-007` (pipeline: round-trip + glossário + gate) e notas
`ENT`/`NFR` do registro de locales, com `prds: ["PRD-93"]`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-89-pseudo-localization-gate|PRD-89]] · [[prd-90-message-plurals-cldr|PRD-90]] · [[prd-91-doc-parity-localized-distribution|PRD-91]]
- ⚙️ Pipelines: [[PIPE-ci - CI|PIPE-ci]]
- 🔗 Mesma versão (0.22.0): [[prd-92-rtl-new-locales|PRD-92]]
- 🚀 ⬅️ release anterior: [[prd-91-doc-parity-localized-distribution|PRD-91 (0.21.0)]] · ➡️ próxima release: [[prd-95-esm-es2023-node22|PRD-95 (0.23.0)]]
<!-- brain:auto:end -->
