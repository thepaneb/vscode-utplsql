<!-- GENERATED FROM docs/brain/20-PRDs/prd-92-rtl-new-locales.md — DO NOT EDIT -->

# PRD-92 — RTL e novos locales (árabe e hebraico)

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.22.0 |
| Arquivos afetados | `src/i18n.ts`, `src/i18n/locales/{ar,he}.ts`, `package.nls.{ar,he}.json`, `package.json` (enum/descrição), `src/statusBar.ts`, `src/decorations.ts`, `docs/brain/60-README/` (2 novas + switcher das 24), `docs/brain/12-I18n/`, `docs/brain/14-NFR/NFR-006`, `docs/brain/70-Wiki/Internationalization.md`, `.opencode/agent/i18n-reviewer.md`, `scripts/docs-check.cjs` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |

## 1. Resumo

A extensão não tem **nenhum locale RTL** (árabe/hebraico), um mercado Oracle
relevante. Esta PRD prepara a UI para **bidirecionalidade** (texto RTL convivendo
com código LTR, que é sempre imperativo aqui) e adiciona os locales `ar` e `he`,
com paridade de catálogo e README.

## 2. Contexto e problema

- Hoje: 24 locales, **0 RTL** (verificado); a entrega leva a **26 locales** e
  **25 variantes** de README (+ `README.md`).
- Elementos sensíveis a direção: status bar (contadores/duração), tooltips,
  decorações inline, diagnóstico no Problems Panel, nós da árvore, e nomes de
  objetos PL/SQL (sempre **LTR**).
- Sem isolamento bidi, um identificador LTR dentro de uma frase RTL pode ser
  reordenado visualmente (`UT3.PKG` “grudando” errado).
- Depende de PRD-90 (plurais): árabe tem 6 categorias de plural.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Aplicar **isolamento bidi** (U+2068/U+2069 FSI/PDI) ao interpolar dados
  técnicos em mensagens, para o trecho LTR não ser reordenado.
- Preparar componentes (status bar, decorações, tooltips) para conteúdo RTL.
- Adicionar `ar` e `he`: catálogos, `package.nls.*`, README variants.
- Revisar o **checklist de pseudo-localização** (PRD-89) sob RTL.

**Não-objetivos**
- Não espelha ícones de forma automática (VSCode já lida com o editor; revisar caso a caso).
- Não cobre `fa`/`ur` neste PRD (candidatos futuros).

## 4. Requisitos

### RF1 — Isolamento bidi na interpolação

`t()` embrulha em FSI/PDI (U+2068/U+2069) os parâmetros de um conjunto fixo de
chaves técnicas (`name`, `path`, `file`, `schema`, `conn`, `id`, `cmd`, `package`,
`proc`, `desc`, `reporter`, `error`) quando o locale é RTL; a prosa não é
isolada. Teste com um identificador `UT3.PKG` dentro de frase em `ar`.

### RF2 — Locales `ar` e `he`

Catálogos completos em `src/i18n/locales/`, com as formas plurais exigidas pelo
CLDR (`ar`: 6; `he`: `one`/`two`/`many`/`other`). Dígitos permanecem latinos
(`Intl` já devolve `12.3` para `ar` no Node 24; teste fixa isso).

### RF3 — Manifesto, README e setting

`package.nls.ar.json`/`he.json`, `README.ar.md`/`he.md` e o **switcher de idiomas
atualizado nas 24 notas existentes** + 2 novas (paridade estrutural — PRD-91).
`utplsql.language` ganha `ar`/`he` no enum e na `markdownDescription`.

### RF4 — Aceite visual

Checklist RTL (status bar, decorates, tooltips, árvore, Problems) no Extension
Development Host com `utplsql.language = ar`.

**Não-funcionais**
- RNF1 — Identificadores PL/SQL nunca reordenados visualmente.
- RNF2 — Paridade de catálogo/README no CI.

## 5. Solução proposta

- Helper de isolamento em `i18n.ts` (`bidiIsolate(text)`) aplicado ao conjunto de
  parâmetros técnicos, só quando o locale é RTL.
- Catálogos `ar`/`he` (tradução + revisão), manifestos, notas de README e
  switcher das variantes; atualizar enum/descrição, `NFR-006` e o agente
  `i18n-reviewer` para 26 locales.
- Reuso dos gates de PRD-89/90/91 (o `docs-check` já deriva o número de
  variantes da PRD-91).

## 6. Configuração

`utplsql.language` ganha `ar` e `he` (e o enum de locales).

## 7. Plano de testes

- **Unitários**: `i18n.test.ts` — isolamento bidi; plurais `ar`/`he`;
  `resolveLocale` para os novos locais.
- **Manual**: Extension Development Host em `ar` — checklist RTL.
- **CI**: paridade de catálogo e README.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Reordenação visual de identificadores | FSI/PDI na interpolação |
| Traduções ar/he imprecisas | Glossário/revisão in-country (PRD-93) |
| Regressão em locais LTR | Isolamento só quando o locale é RTL |

## 9. Rollout

- Release alvo: 0.22.0.
- Bullet no `CHANGELOG.md`; `12-I18n` e wiki `Internationalization`.

## 10. Critérios de aceite

- UI em `ar`/`he` legível; identificadores LTR íntegros.
- Paridade de catálogo/README verde.
- Checklist RTL executado.

## 11. Decisões (2026-11-25)

- Apenas **`ar` e `he`** nesta release; `fa`/`ur` ficam como candidatos da
  0.23.0, dependentes de revisores.
- **Contingência de revisão**: se não houver revisor in-country até o aceite, os
  locales entram com status **beta** no `Registro de locales` (PRD-91) e a
  revisão linguística fica registrada como pendência — o suporte RTL/bidi não é
  bloqueado por isso.
- Atualizar todos os contadores derivados (26 locales, 25 variantes, 25
  manifests + base), inclusive `NFR-006`, MOC/setting e agente `i18n-reviewer`.
- Identificadores técnicos nunca são traduzidos; só recebem isolamento bidi.

## 12. Impacto no cérebro

Criada a regra `BR-I18N-006` (isolamento bidi em locales RTL) com
`prds: ["PRD-92"]`; `ar`/`he` entram como **beta** no registro e o checklist
RTL foi adicionado ao cérebro.

## 13. Impacto nas docs

- `CHANGELOG` — bullet dos locales `ar`/`he` e do suporte RTL (PRD-92).
- `README` — bullet + âncora nos 25 variantes, citando PRD-92.
- `wiki/Internationalization.md` — lista de locales e isolamento bidi (PRD-92).
