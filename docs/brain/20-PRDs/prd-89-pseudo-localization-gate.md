---
tipo: prd
id: PRD-89
aliases: [PRD-89]
status: in-progress
titulo: "Pseudo-localização e gate de strings não traduzidas"
versao: "0.22.0"
data: "2026-09-29"
autor: "Gil Cleber Barboza"
versao_titulo: "0.22.0 — Localização completa"
verificado: 2026-11-25
regras: ["BR-I18N-003"]
docs: ["CHANGELOG", "wiki/Contributing.md"]
tags: [prd]
---

# PRD-89 — Pseudo-localização e gate de strings não traduzidas

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.22.0 |
| Arquivos afetados | `src/i18n.ts`, `src/i18n/locales/*.ts`, `src/test/unit/i18nPseudo.test.ts`, `scripts/scrape-strings.cjs` (novo), `scripts/scrape-strings.allow.json` (novo), `scripts/docs-fidelity.cjs`, `docs/brain/12-I18n/` |
| Esforço estimado | 1 dia |
| Complexidade | Baixa-Média |

## 1. Resumo

Adicionar um **locale pseudo** (`qps-ploc`) que transforma as mensagens — acentua
e expande ~30 % — para (a) revelar **strings de UI não externalizadas** (que
ficam em inglês puro) e (b) simular texto longo (alemão/russo) e expor
**overflow de layout**. Complementa com uma varredura que sinaliza literais
exibidos ao usuário fora de `t()`.

## 2. Contexto e problema

- O catálogo tem 24 locales com paridade garantida (`missingCatalogKeys` +
  `docs-fidelity`), mas **nada** detecta uma string nova escrita direto no código
  (hardcoded) — ela nunca entra em catálogo algum.
- Não há como testar **expansão de texto**: strings alemão/russo são maiores e
  podem quebrar a status bar, tooltips e decorações.
- A skill externa `vscode-ext-localization` reforça: todo recurso localizável deve
  existir em **todos** os locales — mas os autores esquecem de chamar `t()`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Locale pseudo selecionável em desenvolvimento (env `UTPLSQL_PSEUDO_LOC=1`),
  sem aparecer na configuração pública.
- `t()` aplica a transformação pseudo (acentos + padding) quando ativo.
- Teste `i18nPseudo.test.ts` valida determinismo e que toda string do catálogo
  sobrevive à transformação.
- Varredura `scrape-strings.cjs` (heurística) lista literais candidatos em
  `showInformationMessage`/`showErrorMessage`/status bar/decorations que não
  passam por `t()`, com allowlist versionada.
- Checklist manual documentado de layout (Extension Development Host).

**Não-objetivos**
- Não valida *pixel overflow* em CI (VSCode não expõe DOM às extensões).
- Não substitui o gate de paridade existente (que continua).

## 4. Requisitos

### RF1 — Pseudo-locale

`resolveLocale` aceita `qps-ploc` (só via env de dev); `t()` aplica a
transformação **depois da interpolação** (para não corromper `{count}`/`{total}`),
de forma determinística (`a`→`á`, adiciona `~` e padding de ~30 %).

### RF2 — Teste do pseudo

`i18nPseudo.test.ts`: transformação idempotente por chave, sem perder
interpolação `{count}`/`{total}`.

### RF3 — Varredura anti-hardcode

`scrape-strings.cjs` percorre `src/**` (fora de teste) com um parser léxico
ancorado nas chamadas `show*Message(...)` e reporta o primeiro argumento quando é
string/template sem interpolação; allowlist versionada em
`scripts/scrape-strings.allow.json`; **aviso** no CI (`--strict` opt-in para
falhar). O TypeScript 7 nativo não expõe mais o parser clássico no Node, então a
varredura usa regex de chamada (alvo estável) em vez de AST.

### RF4 — Doc de layout

`docs/brain/12-I18n/` ganha a seção "checklist de pseudo-localização" (o que
inspecionar no Extension Development Host).

**Não-funcionais**
- RNF1 — Pseudo desligado por padrão em produção.
- RNF2 — Varredura determinística e sem falsos positivos grosseiros (allowlist).

## 5. Solução proposta

- Mapa de transformação em `i18n.ts` (só ativo com `UTPLSQL_PSEUDO_LOC=1`),
  aplicado após a interpolação.
- `scripts/scrape-strings.cjs` com a API do TypeScript + allowlist versionada.
- Integrar a varredura ao `docs-fidelity`/`docs:check` como **aviso** nesta
  release; o bloqueio (`--strict`) fica para a 0.23.0.

## 6. Configuração

Nenhuma setting pública; apenas env de desenvolvimento.

## 7. Plano de testes

- **Unitários**: `i18nPseudo.test.ts` (transformação, interpolação, determinismo);
  teste do scanner com fixtures.
- **Manual**: Extension Development Host com `UTPLSQL_PSEUDO_LOC=1` — status bar,
  tooltips, decorações, diagnósticos e árvore.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Falsos positivos no scanner | Allowlist + começar como aviso |
| Pseudo escapar para produção | Env-gated; sem setting pública |
| Layout não testável em CI | Checklist manual documentado como aceite |

## 9. Rollout

- Release alvo: 0.22.0.
- Bullet no `CHANGELOG.md`; nota `12-I18n`; referencia a skill `vscode-ext-localization`.

## 10. Critérios de aceite

- `UTPLSQL_PSEUDO_LOC=1` transforma as mensagens; default inalterado.
- Scanner roda no CI e reporta literais hardcoded.
- Checklist de layout documentado e executado no aceite.

## 11. Decisões (2026-11-25)

- **Só aviso** no CI nesta release; `--strict` existe para uso local e o bloqueio
  vira o default na 0.23.0, depois de estabilizar a allowlist.
- Scanner por **parser léxico ancorado** (`show*Message(...)`), não AST: o
  TypeScript 7 nativo não expõe o parser clássico no Node; a allowlist é
  versionada e revisada no PR.
- A transformação pseudo ocorre **depois** da interpolação e nunca altera
  placeholders.
- Integração no `docs-fidelity` (que o `docs:check` já executa), sem job novo.

## 12. Impacto no cérebro

Criada a regra `BR-I18N-003` (mensagem de UI sempre via `t()`; pseudo-loc e
varredura cobrem) com `prds: ["PRD-89"]`; o checklist está em
`12-I18n/Checklist de pseudo-localização.md`.

## 13. Impacto nas docs

- `CHANGELOG` — bullet da pseudo-localização e do scanner (PRD-89).
- `wiki/Contributing.md` — como rodar o pseudo (`UTPLSQL_PSEUDO_LOC=1`) e o gate
  de strings (PRD-89).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 📐 Regras: [[BR-I18N-003 - Mensagens de UI passam por t e a varredura cobre literais|BR-I18N-003]]
- 🔗 Mesma versão (0.22.0): [[prd-88-locale-aware-formatting|PRD-88]] · [[prd-90-message-plurals-cldr|PRD-90]] · [[prd-91-doc-parity-localized-distribution|PRD-91]] · [[prd-92-rtl-new-locales|PRD-92]] · [[prd-93-continuous-localization-pipeline|PRD-93]] · [[prd-115-split-i18n-locales|PRD-115]]
- 🎯 RF1 — Pseudo-locale → [[BR-I18N-003 - Mensagens de UI passam por t e a varredura cobre literais|BR-I18N-003]]
- 🎯 RF3 — Varredura anti-hardcode → [[BR-I18N-003 - Mensagens de UI passam por t e a varredura cobre literais|BR-I18N-003]]
- 🚀 ⬅️ release anterior: [[prd-139-state-store-slicing-lru|PRD-139 (0.21.0)]] · ➡️ próxima release: [[prd-60-branch-coverage-investigation|PRD-60 (0.23.0)]]
<!-- brain:auto:end -->
