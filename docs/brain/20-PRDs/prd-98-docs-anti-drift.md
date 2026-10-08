---
tipo: prd
id: PRD-98
aliases: [PRD-98]
status: proposed
titulo: "Anti-drift de documentação: tabelas geradas e vínculo PRD→docs"
versao: "0.16.0"
data: "2026-10-08"
autor: "Gil Cleber"
verificado: 2026-10-08
regras: []
tags: [prd]
---

# PRD-98 — Anti-drift de documentação: tabelas geradas e vínculo PRD→docs

| Campo | Valor |
|---|---|
| Autor | Gil Cleber |
| Data | 2026-10-08 |
| Componente | Tooling do repo (`scripts/**`), vault (`docs/brain/**`), skills e CI |
| Versão alvo | 0.16.0 |
| Arquivos afetados | `scripts/brain.cjs`, `scripts/brain-build.cjs`, `scripts/docs-fidelity.cjs`, `scripts/docs-check.cjs`, `scripts/brain-rules.cjs`, `scripts/brain-gaps.cjs`, `package.json`, `.github/workflows/ci.yml`, `.opencode/skills/prd-workflow`, `.opencode/skills/release`, `docs/brain/**` |
| Esforço estimado | 3–5 dias |
| Complexidade | Média-Alta |

## 1. Resumo

Criar mecanismos para que **README, wiki, vault e posts** nunca voltem a ficar
desatualizados em relação ao que as **PRDs entregam**. Duas frentes: (a)
**gerar** as partes mecânicas (tabelas de settings e de comandos) a partir do
`package.json`, fonte única; e (b) **cobrar por máquina** o vínculo entre cada
PRD concluída e as superfícies de documentação que ela toca. O gatilho foi a
**0.15.0**, que saiu com as features ausentes da lista do README e do wiki.

## 2. Contexto e problema

O repo já é forte em documentação: o vault (`docs/brain/`) é a fonte da verdade,
`README*`/`docs/wiki`/`docs/functional`/`docs/prd` são **gerados**
(`brain:build`), e há checks (`brain:ci`, `docs:check`, `brain:rules`,
`brain:gaps`). Ainda assim, a **0.15.0** publicou com três lacunas:

1. **README**: as 6 features novas não entraram na **lista de features** (só nas
   tabelas de settings/commands, que o `docs:fidelity` cobra).
2. **Wiki**: `Configuration.md` sem as settings novas (`autoRun*`,
   `showTagsInTree`) e sem o valor `tag`; `Commands.md` sem os 3 debug variants;
   `Debugger.md`/`Test-explorer.md` sem as variações de debug e o diff inline.
3. **Posts**: nenhum post de feature dedicado (só o de release).

Causas-raiz (pontos cegos dos checks atuais):

- **Tabelas são prosa mantida à mão** — settings/comandos não são gerados, então
  envelhecem sozinhos.
- **`docs:fidelity` é parcial/tolerante**: settings só ↔ **README** (não o
  wiki); comandos ↔ wiki **por tokens** (ex.: "Debug"/"Test"/"Cursor" já
  existiam) — falso-negativo.
- **Nenhuma obrigação PRD → docs**: nada detecta "a feature existe no
  código/PRD mas não está documentada em lugar nenhum".
- **Bullets de feature e posts** são curadoria manual, sem fonte estruturada.

Referência do incidente: PRs #159–#164 (correções pós-0.15.0).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Eliminar a classe **mecânica** de drift (tabelas de settings/comandos).
- Tornar os checks **estritos** e **completos** (README **e** wiki; por id/título).
- Criar **rastreabilidade bidirecional PRD ↔ docs** (como já existe PRD ↔ regra).
- Dar **fonte estruturada** às features → bullet do README + post do LinkedIn.
- Bloquear a release se uma PRD concluída não tiver docs/posts correspondentes.

**Não-objetivos**
- Reescrever posts de releases antigos (histórico).
- Traduzir automaticamente prosa para os 24 idiomas (a tradução segue manual;
  muda só a **checagem**).
- Gerar a prosa narrativa (intros/exemplos) — só as **tabelas** são geradas.
- Substituir `brain:rules`/`docs:check` — a PRD os **estende**.

## 4. Requisitos

### RF1 — Tabelas de settings e comandos geradas (fonte única = `package.json`)

`brain:sync` (ou `brain:build`) injeta, entre marcadores no padrão do vault
(`brain:auto:start:<nome>` / `brain:auto:end:<nome>`):

- **Tabela de settings** no `README.md` (EN) e em `docs/brain/70-Wiki/Configuration.md`;
- **Tabela de comandos** no `README.md` (EN) e em `docs/brain/70-Wiki/Commands.md`.

Colunas derivadas de `contributes.configuration`/`contributes.commands` (+
`package.nls.json`). A prosa ao redor fica fora dos marcadores. As **23
variantes** de README continuam manuais (prosa), mas passam a ser checadas
(RF2/RF4).

### RF2 — `docs:fidelity` estrito e completo

- **settings ↔ README.md _e_ `wiki/Configuration.md`** (todos os ids;
  bidirecional).
- **comandos ↔ `wiki/Commands.md` e README** por **id ou título exato** (não
  por tokens).
- Cobrir também `enumDescriptions`/valores de enum relevantes.
- Falha no `docs:check` (CI).

### RF3 — Vínculo PRD → docs (bidirecional)

- Novo frontmatter nas PRDs: `docs: ["README", "wiki/Configuration.md",
  "wiki/Commands.md", "CHANGELOG", "docs/linkedin/releases/…"]` (superfícies
  tocadas).
- Check (em `brain:rules`/`docs:check`): **PRD concluída** (≥ 0.14.0) precisa
  declarar `docs:`, e cada superfície listada precisa **mencionar o id da PRD**
  (ou um marcador de feature), dando o rastreio reverso (como o "↩️ Referenciada
  por" das regras).

### RF4 — Registro de features (fonte para bullets + posts)

- Arquivo estruturado (ex.: `docs/brain/10-Projeto/features.yml` ou frontmatter
  de uma nota) com, por feature: `id`, `prd`, `readme_bullet` (EN), `wiki`
  (página/âncora), `linkedin` (post pt/en), `card` (id do card).
- Gera/valida: bullet no `README.md` (EN), existência do **post pt+en**, do
  **card** e da menção no **wiki**.
- Para as **23 variantes**: checagem por **emoji-âncora** (o mesmo mecanismo
  usado no incidente), sem exigir tradução automática.

### RF5 — Gate de release

- `npm run docs:features-check -- <versão>`: cada PRD concluída na versão deve
  ter CHANGELOG + bullet no README + menção no wiki + post (pt+en) + card.
- Entra no checklist da skill `release` e no CI (`ci.yml`).

### RF6 — Convenção por tipo de PRD + seção "Impacto nas docs"

- No `prd-workflow`: mapear tipo → docs obrigatórios (setting novo →
  `Configuration.md`; comando novo → `Commands.md`; UI → `Test-explorer`/
  `Debugger`/`Coverage`; toda feature de usuário → bullet no README + post).
- Seção obrigatória **"## Impacto nas docs"** na PRD (análoga a "## Impacto no
  cérebro"), validada por máquina na conclusão.

**Não-funcionais**
- RNF1 — Sem novas dependências: scripts em Node puro, como os demais.
- RNF2 — Checks **neutros de idioma** para ids de código; a prosa em 24 idiomas
  é checada por âncora, não por tradução.
- RNF3 — Preservar o fluxo `vault → brain:build → repo` e o CI de drift
  (`brain:ci` + `git diff --exit-code`).
- RNF4 — Falso-positivos próximos de zero; checks novos entram como **aviso**
  por 1 ciclo e só então viram erro (evitar bloquear PRs legítimos).

## 5. Solução proposta

**Camada A — geração (RF1).** Estender `brain:sync` para injetar as tabelas nos
marcadores; `brain:build` publica README/wiki. As tabelas passam a ser artefatos
gerados (não editáveis à mão), como o MOC e o `index.md` de PRDs.

**Camada B — checagem (RF2/RF3/RF5).** Estender `docs-fidelity.cjs`
(settings/comandos ↔ README+wiki, por id) e `brain-rules.cjs`/`docs-check.cjs`
(PRD `docs:` bidirecional + `docs:features-check`). Tudo em Node puro, rodando no
`docs:check`/`brain:ci` (CI).

**Camada C — registro (RF4) + convenção (RF6).** `features.yml` como fonte dos
bullets EN e dos posts; `prd-workflow`/`release` ganham a seção "Impacto nas
docs" e o passo de gate.

Ordem de implementação sugerida (entregável incremental):
1. RF1 + RF2 (maior ganho, menor risco, neutro de idioma).
2. RF3 (obrigação `docs:` na PRD).
3. RF4 (registro → README/post).
4. RF5 + RF6 (gate + convenção).

## 6. Configuração

Nenhuma setting/comando novo na extensão. Novos **scripts npm** de tooling:
`docs:features-check` (e eventuais `brain:docs`).

## 7. Plano de testes

- **Unitários**: `docsFidelity.test.ts` (casos para settings/comandos ↔ wiki e
  id exato; falso-positivo de token); `brainRules.test.ts` (PRD `docs:`
  bidirecional; `features.yml`); `brainBuild.test.ts` (tabelas geradas +
  marcadores + drift).
- **Integração**: não aplicável (tooling puro).
- **Validação manual**: rodar `brain:ci`/`docs:check` num PR que adicione uma
  setting/comando **sem** documentar → deve falhar; com documentação → passa.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Checks estritos bloquearem PRs legítimos | Começar como **aviso**; baseline de exceções (`RULES_BASELINE`-like); só então erro |
| Migração das tabelas manuais para geradas | Injetar os marcadores preservando a prosa; revisar o diff antes de ativar |
| Prosa em 24 idiomas não traduzida | Checagem por **emoji-âncora** (não exige tradução); RF4 opcional por idioma |
| `features.yml` virar fonte paralela ao vault | Manter no vault (`docs/brain`) e validar por `brain:gaps`/links |
| Escopo grande (6 RFs) | Entregar em 4 incrementos (RF1+2 → RF3 → RF4 → RF5+6) |

## 9. Rollout

- **0.16.0** (próxima versão prevista; junta-se às PRD-95 e PRD-97).
- Registrar no `CHANGELOG.md` e, se aplicável, num post de feature
  (`docs/linkedin/features/37-…`) + post de release `08-release-v0.16.0`.
- Publicação via **GitHub release** (`publish.yml`), como sempre.

## 10. Critérios de aceite

- `docs:check`/`brain:ci` **falham** se uma setting/comando existir no
  `package.json` e faltar no README **ou** no wiki (por id/título).
- Uma PRD concluída sem `docs:` (ou com superfície listada que não cita a PRD)
  **falha** no `brain:rules`/`docs:check`.
- `docs:features-check <versão>` acusa feature sem bullet no README, sem menção
  no wiki ou sem post/card.
- As tabelas de settings/comandos do README e do wiki são **geradas** (drift
  detectado por `git diff --exit-code`).
- `brain:sync`/`brain:build`/`docs:check`/`brain:rules`/`brain:gaps` verdes.

## 11. Questões em aberto

- `features.yml` (arquivo) vs. frontmatter numa nota do vault — decidir na
  implementação (preferência: nota do vault, para links e `brain:gaps`).
- Manter as tabelas geradas **também** nas 23 variantes de README, ou só no EN
  (as variantes seguem a checagem de settings do `docs:check`).
- Nível de rigor inicial (aviso vs. erro) por check.

## 12. Impacto no cérebro

Nenhuma regra nesta proposta (PRD `proposed`). Na **conclusão**, criar as regras
que a PRD materializa — provavelmente `BR-DOC-*` (ex.: "settings/comandos são
gerados do `package.json`", "PRD concluída exige vínculo `docs:`") — com
`prds: ["PRD-98"]`, `implementacao:` e `testes:`, e confirmar o vínculo
bidirecional com `npm run brain:rules`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-95-esm-es2023-node22|PRD-95]] · [[prd-97-doc-no-site|PRD-97]]
- ⚙️ Pipelines: [[PIPE-ci - CI|PIPE-ci]]
- 🚀 ⬅️ release anterior: [[prd-96-public-landing-page-github-pages|PRD-96 (0.15.0)]] · ➡️ próxima release: [[prd-56-duration-persistence|PRD-56 (0.17.0)]]
<!-- brain:auto:end -->
