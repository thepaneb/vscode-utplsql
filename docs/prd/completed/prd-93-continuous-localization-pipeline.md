<!-- GENERATED FROM docs/brain/20-PRDs/prd-93-continuous-localization-pipeline.md — DO NOT EDIT -->

# PRD-93 — Pipeline de localização contínua (glossário, TM e revisão)

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.22.0 |
| Arquivos afetados | `scripts/i18n-export.cjs`, `scripts/i18n-apply.cjs`, `scripts/i18n-check.cjs` (novos), `src/i18n/locales/*.ts`, `docs/brain/12-I18n/` (glossário + registro/donos), `.opencode/skills/`, `.github/workflows/ci.yml` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |

## 1. Resumo

Com 24 locales (26 com `ar`/`he` na 0.22.0), a manutenção manual não escala. Esta PRD
define um **pipeline de localização contínua**: exportar/importar catálogos com
**translation memory** e **glossário**, dono/revisor por locale, e gates de
qualidade no CI — via scripts próprios e, opcionalmente, um TMS.

## 2. Contexto e problema

- Os catálogos vivem em `src/i18n/locales/*.ts` (após a PRD-115) +
  `package.nls.*.json`; adicionar uma string exige editar 26 lugares (ou mais,
  contando README).
- Não há **glossário** para termos críticos (`utPLSQL`, `PL/SQL`, `V$SQL`, `thin`,
  `DBMS_DEBUG`, `wallet`) — risco de traduções divergentes.
- Não há **memória de tradução**: a mesma frase é retraduzida do zero.
- Não há dono/revisor por locale nem processo de revisão in-country.

## 3. Objetivos / Não-objetivos

**Objetivos**
- **Formatos de intercâmbio**: `scripts/i18n-export.cjs` gera arquivos por locale
  (ex.: JSON/CSV/`xliff`); `i18n-apply.cjs` reimporta e valida.
- **Glossário** versionado no vault (`12-I18n/Glossário de localização.md`) e
  checado em tradução.
- **Registro de donos/revisores** por locale (o mesmo `12-I18n/Registro de
  locales.md` da PRD-91).
- **Gate de qualidade**: paridade, plurais (PRD-90), pseudo-loc (PRD-89) e
  glossário no CI.
- **Opção TMS** documentada (Crowdin/Lokalise/Smartling) com o fluxo equivalente.

**Não-objetivos**
- Não contrata tradução automática de baixa qualidade como fonte.
- Não muda o mecanismo de runtime (catálogo próprio permanece — ADR do PRD-90).

## 4. Requisitos

### RF1 — Export/Import

`i18n-export` produz um artefato **JSON** por locale com chaves, formas plurais e
contexto; `i18n-apply` valida e **regenera o arquivo inteiro** de
`src/i18n/locales/<locale>.ts` a partir do modelo, rodando o Biome em seguida
(em vez de edição cirúrgica), com round-trip idempotente e diferença mínima.

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

## 11. Decisões (2026-11-25)

- **Sem TMS nesta release**: scripts próprios (`i18n-export.cjs`/`i18n-apply.cjs`)
  com export JSON por locale; o fluxo equivalente para Crowdin/Lokalise/Smartling
  fica documentado como opção futura (sem credencial no repo).
- `i18n-apply` **regenera o arquivo inteiro** e roda Biome; a idempotência é
  provada por round-trip, não por edição linha a linha.
- Glossário e donos/revisores vivem em notas do vault (`12-I18n/`), reaproveitando
  o registro da PRD-91.
- Gate único (`i18n:check`) cobre paridade, plurais, pseudo e glossário; o modo
  aviso/bloqueio segue a decisão da PRD-89.

## 12. Impacto no cérebro

Criada a regra `BR-I18N-007` (pipeline: round-trip + glossário + gate) com
`prds: ["PRD-93"]`; o glossário está em `12-I18n/Glossário de localização.md` e
o registro/donos em `12-I18n/Registro de locales.md`.

RNFs sem regra: RNF1, RNF2 (cobertos pelos testes/gates de qualidade).

## 13. Impacto nas docs

- `CHANGELOG` — bullet do pipeline de localização (PRD-93).
- `wiki/Contributing.md` — fluxo `i18n-export`/`i18n-apply`, glossário e
  donos/revisores (PRD-93).
