<!-- GENERATED FROM docs/brain/20-PRDs/prd-89-pseudo-localization-gate.md — DO NOT EDIT -->

# PRD-89 — Pseudo-localização e gate de strings não traduzidas

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
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

`scrape-strings.cjs` usa a **API do compilador TypeScript** (não regex) para
percorrer `src/**` (fora de teste) e reportar literais de UI fora de `t()`;
allowlist versionada em `scripts/scrape-strings.allow.json`; **aviso** no CI
(`--strict` opt-in para falhar).

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
- Scanner via **AST do TypeScript** (o `typescript` já é devDependency), não
  regex; a allowlist é versionada e revisada no PR.
- A transformação pseudo ocorre **depois** da interpolação e nunca altera
  placeholders.
- Integração no `docs-fidelity` (que o `docs:check` já executa), sem job novo.

## 12. Impacto no cérebro

Esperado criar `BR-I18N-003` (mensagem de UI sempre via `t()`; pseudo-loc e
varredura cobrem) com `prds: ["PRD-89"]`.

## 13. Impacto nas docs

- `CHANGELOG` — bullet da pseudo-localização e do scanner (PRD-89).
- `wiki/Contributing.md` — como rodar o pseudo (`UTPLSQL_PSEUDO_LOC=1`) e o gate
  de strings (PRD-89).
