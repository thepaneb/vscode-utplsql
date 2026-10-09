---
tipo: prd
id: PRD-104
aliases: [PRD-104]
status: proposed
titulo: "Cadeia de suprimentos do CI: Dependabot, pin de actions e auditoria de dependências"
versao: "0.20.0"
data: "2026-10-09"
autor: "Gil Cleber Barboza"
versao_titulo: "0.20.0 — Qualidade e CI"
verificado: 2026-10-09
regras: []
tags: [prd]
---

# PRD-104 — Cadeia de suprimentos do CI: Dependabot, pin de actions e auditoria de dependências

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | CI/CD do repositório (`.github/`) |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `.github/workflows/*.yml`, `.github/dependabot.yml` (novo), `.github/workflows/codeql.yml` (opcional — só se migrar para *advanced*), `docs/brain/**` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-81 (segurança), publicação (skill `release`) |

## 1. Resumo

Endurecer a cadeia de suprimentos do repositório: **Dependabot** (npm + GitHub
Actions), **pin de actions por SHA** com permissões escopadas e **gate de
`npm audit`**. O **CodeQL já está ativo** no repositório via *default setup* do
GitHub (sem workflow commitado) — esta PRD apenas confirma/decide o destino dele,
não o cria do zero.

## 2. Contexto e problema

- O repositório é **público** e as workflows usam actions por tag de major.
- **Não há** `.github/dependabot.yml` (confirmado por `grep`).
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
- Pinar as actions em SHA de commit e escopar `permissions`.
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

- Toda action referenciada por **SHA** (com comentário da versão).
- `permissions: contents: read` no topo de cada workflow (mínimo privilégio).

### RF4 — Auditoria de dependências

- `npm audit --omit=dev --audit-level=high` como gate; o de dev é informativo.

**Não-funcionais**
- RNF1 — Sem aumento perceptível do tempo do CI no caminho crítico.
- RNF2 — O CodeQL (default ou advanced) não deve falhar por ruído de código
  gerado (`dist/`, `out/`).

## 5. Solução proposta

- Novo arquivo `.github/dependabot.yml`.
- Ajuste dos workflows existentes (`ci.yml`, `integration.yml`, `pages.yml`,
  `wiki.yml`) para SHA + `permissions`.
- CodeQL: **nenhuma ação por padrão** (manter o default setup). Se a decisão for
  *advanced*, desabilitar o default setup no GitHub e só então adicionar
  `codeql.yml`.

## 6. Configuração

Nenhuma setting da extensão.

## 7. Plano de testes

- **Validação manual**: abrir um PR de dependência gerado pelo Dependabot;
  confirmar que o CodeQL (já ativo) segue reportando no Security tab; `npm audit`
  falha com advisory `high` de produção (teste controlado em fork).
- **CI**: `brain:ci`/`docs:check` seguem verdes.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| CodeQL *default* sem `paths-ignore` gerar ruído | Avaliar; se necessário migrar para *advanced* com `paths-ignore` |
| CodeQL duplicado (default + workflow) | GitHub recusa; migrar implica **desabilitar** o default antes |
| Excesso de PRs do Dependabot | Agrupamento minor/patch semanal |
| Pin por SHA “congela” sem atualização | Dependabot bumpa os pins automaticamente |

## 9. Rollout

- **0.20.0** (patch de infraestrutura; sem mudança de runtime).
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- `.github/dependabot.yml` presente; actions pinadas por SHA; `permissions` escopadas.
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

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-81-security-hardening|PRD-81]]
- 🚀 ⬅️ release anterior: [[prd-107-unprivileged-fixture|PRD-107 (0.19.0)]] · ➡️ próxima release: [[prd-88-locale-aware-formatting|PRD-88 (0.21.0)]]
<!-- brain:auto:end -->
