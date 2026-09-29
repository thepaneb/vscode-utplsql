---
tipo: prd
id: PRD-89
aliases: [PRD-89]
status: proposed
titulo: "Pseudo-localização e gate de strings não traduzidas"
versao: "0.17.0"
data: "2026-09-29"
autor: "Gil Cleber Barboza"
verificado: 2026-09-29
regras: []
tags: [prd]
---

# PRD-89 — Pseudo-localização e gate de strings não traduzidas

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.17.0 |
| Arquivos afetados | `src/i18n.ts`, `src/i18nLocales.ts`, `src/test/unit/i18nPseudo.test.ts`, `scripts/scrape-strings.cjs` (novo), `scripts/docs-fidelity.cjs`, `docs/brain/12-I18n/` |
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

`resolveLocale` aceita `qps-ploc` (só via env de dev); `t()` transforma o texto de
forma determinística (`a`→`á`, adiciona `~` e padding de ~30 %).

### RF2 — Teste do pseudo

`i18nPseudo.test.ts`: transformação idempotente por chave, sem perder
interpolação `{count}`/`{total}`.

### RF3 — Varredura anti-hardcode

`scrape-strings.cjs` percorre `src/**` (fora de teste) e reporta literais de UI
fora de `t()`; allowlist em arquivo versionado; falha (ou avisa) conforme modo.

### RF4 — Doc de layout

`docs/brain/12-I18n/` ganha a seção "checklist de pseudo-localização" (o que
inspecionar no Extension Development Host).

**Não-funcionais**
- RNF1 — Pseudo desligado por padrão em produção.
- RNF2 — Varredura determinística e sem falsos positivos grosseiros (allowlist).

## 5. Solução proposta

- Mapa de transformação em `i18n.ts` (só ativo com `UTPLSQL_PSEUDO_LOC=1`).
- `scripts/scrape-strings.cjs` com AST leve (regex por chamada) + allowlist.
- Integrar a varredura ao `brain:ci`/`docs:check` como **aviso** inicialmente.

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

- Release alvo: 0.17.0.
- Bullet no `CHANGELOG.md`; nota `12-I18n`; referencia a skill `vscode-ext-localization`.

## 10. Critérios de aceite

- `UTPLSQL_PSEUDO_LOC=1` transforma as mensagens; default inalterado.
- Scanner roda no CI e reporta literais hardcoded.
- Checklist de layout documentado e executado no aceite.

## 11. Questões em aberto

- Scanner bloqueia ou só avisa? (proposta: aviso no 0.17.0, gate no 0.18.0.)

## 12. Impacto no cérebro

Esperado criar `BR-I18N-003` (mensagem de UI sempre via `t()`; pseudo-loc e
varredura cobrem) com `prds: ["PRD-89"]`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🚀 ⬅️ release anterior: [[prd-59-scaffold-suite|PRD-59 (0.16.0)]] · ➡️ próxima release: [[prd-92-rtl-new-locales|PRD-92 (0.18.0)]]
<!-- brain:auto:end -->
