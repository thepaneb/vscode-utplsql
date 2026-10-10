---
tipo: prd
id: PRD-92
aliases: [PRD-92]
status: proposed
titulo: "RTL e novos locales (árabe e hebraico)"
versao: "0.22.0"
data: "2026-09-29"
autor: "Gil Cleber Barboza"
versao_titulo: "0.22.0 — Localização (RTL, novos locales e pipeline)"
verificado: 2026-09-29
regras: []
tags: [prd]
---

# PRD-92 — RTL e novos locales (árabe e hebraico)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.22.0 |
| Arquivos afetados | `src/i18n.ts`, `src/i18nLocales.ts`, `package.nls.ar.json`, `package.nls.he.json`, `src/statusBar.ts`, `src/decorations.ts`, `README.ar.md`, `README.he.md`, `docs/brain/12-I18n/` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |

## 1. Resumo

A extensão não tem **nenhum locale RTL** (árabe/hebraico), um mercado Oracle
relevante. Esta PRD prepara a UI para **bidirecionalidade** (texto RTL convivendo
com código LTR, que é sempre imperativo aqui) e adiciona os locales `ar` e `he`,
com paridade de catálogo e README.

## 2. Contexto e problema

- Hoje: 24 locales, **0 RTL** (verificado).
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

`t()` embrulha parâmetros técnicos (nomes, paths, códigos ORA/PLS) em FSI/PDI
quando o locale é RTL.

### RF2 — Locales `ar` e `he`

Catálogos completos, com as formas plurais exigidas pelo CLDR (`ar`: 6; `he`:
`one`/`two`/`many`/`other`).

### RF3 — Manifesto e README

`package.nls.ar.json`/`package.nls.he.json` e `README.ar.md`/`README.he.md`
(paridade estrutural — PRD-91).

### RF4 — Aceite visual

Checklist RTL (status bar, decorates, tooltips, árvore, Problems) no Extension
Development Host com `utplsql.language = ar`.

**Não-funcionais**
- RNF1 — Identificadores PL/SQL nunca reordenados visualmente.
- RNF2 — Paridade de catálogo/README no CI.

## 5. Solução proposta

- Helper de isolamento em `i18n.ts` (`bidiIsolate(text)`) aplicado a parâmetros
  marcados.
- Catálogos `ar`/`he` (tradução + revisão) e manifestos.
- Reuso dos gates de PRD-89/90/91.

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

## 11. Questões em aberto

- Incluir `fa`/`ur` no mesmo ciclo? (depende de revisores.)

## 12. Impacto no cérebro

Esperado criar `BR-I18N-006` (isolamento bidi em locales RTL) com
`prds: ["PRD-92"]`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-89-pseudo-localization-gate|PRD-89]] · [[prd-90-message-plurals-cldr|PRD-90]] · [[prd-91-doc-parity-localized-distribution|PRD-91]] · [[prd-93-continuous-localization-pipeline|PRD-93]]
- 🔗 Mesma versão (0.22.0): [[prd-93-continuous-localization-pipeline|PRD-93]]
- 🚀 ⬅️ release anterior: [[prd-91-doc-parity-localized-distribution|PRD-91 (0.21.0)]] · ➡️ próxima release: [[prd-111-decompose-oracle-runner|PRD-111 (0.23.0)]]
<!-- brain:auto:end -->
