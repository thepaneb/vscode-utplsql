<!-- GENERATED FROM docs/brain/20-PRDs/prd-104-ci-supply-chain.md — DO NOT EDIT -->

# PRD-104 — Cadeia de suprimentos do CI: Dependabot, pin de actions e auditoria de dependências

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | CI/CD do repositório (`.github/`) |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `.github/workflows/*.yml`, `.github/dependabot.yml` (novo), `.github/workflows/codeql.yml` (opcional — só se migrar para *advanced*), `docs/brain/**` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-81 (segurança), PRD-110 (hardening defensivo), publicação (skill `release`) |

## 1. Resumo

Endurecer a cadeia de suprimentos do repositório: **Dependabot** (npm + GitHub
Actions), **pin de actions por SHA** com permissões escopadas e **gate de
`npm audit`**. O **CodeQL já está ativo** no repositório via *default setup* do
GitHub (sem workflow commitado) — esta PRD apenas confirma/decide o destino dele,
não o cria do zero.

## 2. Contexto e problema

- O repositório é **público** e as workflows usam actions por tag de major.
- **Não há** `.github/dependabot.yml` (confirmado por `grep`).
- **Cobertura incompleta de workflows**: a primeira versão desta PRD listava só
  `ci`, `integration`, `pages` e `wiki`. Ficam de fora `publish.yml` (sem
  `permissions:` no topo — o job `verify` roda com o token padrão) e os
  workflows auxiliares `bing-index.yml`, `google-index.yml`, `pagespeed.yml` e
  `site-health.yml` (actions por tag, ex.: `actions/setup-python@v5`). Além
  disso, `wiki.yml` embute `${{ secrets.GITHUB_TOKEN }}` na URL do `git clone`,
  expondo o token em `argv`/log.
- **O CodeQL já roda** via *default setup* do GitHub — os checks do PR #179
  mostram `Analyze (javascript-typescript)`, `Analyze (actions)`,
  `Analyze (python)` — e **não** há `.github/workflows/codeql.yml`. Ou seja, a
  parte de análise estática já está coberta; recriá-la como workflow colidiria
  com o *default setup*.
- `oracledb` e `fast-xml-parser` são `dependencies` empacotadas no `.vsix`
  (esbuild inline) — um advisory nelas é de produção, não só de dev.
- Referência de porte: `.github/dependabot.yml`, `.github/workflows/codeql.yml`
  e `ci.yml` do `paddi35/utplsql-for-vscode` (permissões `contents: read`,
  actions pinadas por SHA, `npm audit` no gate). Lá o CodeQL é um workflow
  commitado, escolha deliberada ("query selection reviewable"); aqui o default
  setup já cumpre o papel sem manutenção.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Dependabot semanal para `npm` e `github-actions`, agrupando minor/patch.
- Pinar as actions em SHA de commit e escopar `permissions` em **todos** os
  workflows — `ci`, `integration`, `pages`, `wiki`, `publish` e os auxiliares
  (`bing-index`, `google-index`, `pagespeed`, `site-health`).
- Gate de `npm audit` (produção em `high`, dev informativo).
- **Decidir o CodeQL**: manter o *default setup* (recomendado) **ou** migrar para
  um workflow *advanced* — nunca os dois ao mesmo tempo.

**Não-objetivos**
- Trocar o provedor de CI.
- Recriar o CodeQL do zero apenas para “commitar” a configuração.
- Assinatura/atestação de artefatos (SLSA) — follow-up.

## 4. Requisitos

### RF1 — Dependabot

- `.github/dependabot.yml` com os ecossistemas `npm` e `github-actions`,
  `schedule.weekly`, grupos `minor-patch` (majors abrem individualmente).

### RF2 — CodeQL (confirmar/decidir, não recriar)

- **Recomendado:** manter o *default setup* do GitHub (já ativo, zero
  manutenção); **não** criar `.github/workflows/codeql.yml`.
- Confirmar que a análise cobre `javascript-typescript` e que não gera ruído em
  artefatos gerados (`dist/`, `out/`); se gerar, migrar para *advanced*.
- **Alternativa (advanced):** migrar para `.github/workflows/codeql.yml` com
  `github/codeql-action` e `paths-ignore` (`dist/`, `out/`), **desabilitando
  antes** o default setup (GitHub recusa ter os dois).

### RF3 — Pin e permissões

- Toda action referenciada por **SHA** (com comentário da versão), em **todos**
  os workflows — incluindo `publish.yml` e os auxiliares (`bing-index`,
  `google-index`, `pagespeed`, `site-health`).
- `permissions: contents: read` no topo de **cada** workflow (mínimo privilégio).
  Escopos elevados só onde necessário: `publish.yml` → `contents: write` apenas
  no job `publish` (o `verify` fica `contents: read`); `pages.yml` → `pages` +
  `id-token`; `wiki.yml` → `contents: write`.
- `wiki.yml`: **não** colocar o `GITHUB_TOKEN` na URL do `git clone`. Usar um
  `http.extraheader` (ou credential helper) efêmero, para que o token não fique
  exposto em `argv`/log.

### RF4 — Auditoria de dependências

- `npm audit --omit=dev --audit-level=high` como gate; o de dev é informativo.

**Não-funcionais**
- RNF1 — Sem aumento perceptível do tempo do CI no caminho crítico.
- RNF2 — O CodeQL (default ou advanced) não deve falhar por ruído de código
  gerado (`dist/`, `out/`).

## 5. Solução proposta

- Novo arquivo `.github/dependabot.yml`.
- Ajuste de **todos** os workflows (`.github/workflows/*.yml` — `ci`,
  `integration`, `pages`, `wiki`, `publish` e os auxiliares de índice/saúde)
  para SHA + `permissions:` no topo; no `publish.yml`, `contents: write` só no
  job `publish`.
- `wiki.yml`: trocar o token embutido na URL do clone por um `http.extraheader`
  efêmero.
- CodeQL: **nenhuma ação por padrão** (manter o default setup). Se a decisão for
  *advanced*, desabilitar o default setup no GitHub e só então adicionar
  `codeql.yml`.

## 6. Configuração

Nenhuma setting da extensão.

## 7. Plano de testes

- **Validação manual**: abrir um PR de dependência gerado pelo Dependabot;
  confirmar que o CodeQL (já ativo) segue reportando no Security tab; `npm audit`
  falha com advisory `high` de produção (teste controlado em fork).
- **Validação manual (workflows)**: `grep` confirma que não resta action por tag
  (`uses:` terminando em `@vN`) e que todo `.github/workflows/*.yml` tem
  `permissions:` no topo; *dispatch* de `wiki.yml`/`pages.yml` verde; release de
  preview do `publish.yml`.
- **CI**: `brain:ci`/`docs:check` seguem verdes.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| CodeQL *default* sem `paths-ignore` gerar ruído | Avaliar; se necessário migrar para *advanced* com `paths-ignore` |
| CodeQL duplicado (default + workflow) | GitHub recusa; migrar implica **desabilitar** o default antes |
| Excesso de PRs do Dependabot | Agrupamento minor/patch semanal |
| Pin por SHA “congela” sem atualização | Dependabot bumpa os pins automaticamente |
| Pinar/escopar `publish.yml` quebrar a publicação | Validar num release de preview; `contents: write` mantido só no job `publish` |
| `http.extraheader` do `wiki.yml` falhar conforme versão do git | Fallback documentado: credential helper efêmero; testar com *dispatch* |

## 9. Rollout

- **0.20.0** (patch de infraestrutura; sem mudança de runtime).
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- `.github/dependabot.yml` presente; **todas** as actions pinadas por SHA e
  `permissions:` escopadas no topo de cada workflow (incluindo `publish.yml` e os
  auxiliares).
- `wiki.yml` sem o `GITHUB_TOKEN` embutido na URL do clone.
- Gate de `npm audit` operante.
- **Decisão do CodeQL documentada** (default mantido **ou** advanced) e a análise verde.

## 11. Questões em aberto

- Manter o CodeQL *default setup* (recomendado) ou migrar para *advanced*
  versionado, como no `paddi35`?
- Incluir `github-actions` no mesmo PR de grupo do npm?

## 12. Impacto no cérebro

Na conclusão, criar a regra `BR-PLAT-*` ("actions pinadas por SHA e permissões
escopadas; dependências auditadas no CI"), com `prds: ["PRD-104"]`,
`implementacao:` e `testes:`. Enquanto `proposed`, `regras: []`.
