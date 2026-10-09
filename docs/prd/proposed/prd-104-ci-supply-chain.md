<!-- GENERATED FROM docs/brain/20-PRDs/prd-104-ci-supply-chain.md — DO NOT EDIT -->

# PRD-104 — Cadeia de suprimentos do CI: CodeQL, Dependabot e pin de actions

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | CI/CD do repositório (`.github/`) |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `.github/workflows/*.yml`, `.github/dependabot.yml` (novo), `.github/workflows/codeql.yml` (novo), `docs/brain/**` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Relaciona-se a | Phases de segurança (PRD-81), publicação (skill `release`) |

## 1. Resumo

Endurecer a cadeia de suprimentos do repositório: **Dependabot** (npm + GitHub
Actions), **CodeQL** (análise estática) e **pin de actions por SHA** com
permissões escopadas. Hoje o repo não tem `dependabot.yml` nem CodeQL.

## 2. Contexto e problema

- O repositório é **público** e as workflows usam actions por tag de major.
- **Não há** `dependabot.yml` nem CodeQL (confirmado: `grep` não encontra).
- `oracledb` e `fast-xml-parser` são `dependencies` empacotadas no `.vsix`
  (esbuild inline) — um advisory nelas é de produção, não só de dev.
- Referência de porte: `.github/dependabot.yml`, `.github/workflows/codeql.yml`
  e `ci.yml` do `paddi35/utplsql-for-vscode` (permissões `contents: read`,
  actions pinadas por SHA, `npm audit` no gate).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Dependabot semanal para `npm` e `github-actions`, agrupando minor/patch.
- CodeQL em push/PR e semanal.
- Pinar as actions em SHA de commit e escopar `permissions`.
- Gate de `npm audit` (produção em `high`, dev informativo).

**Não-objetivos**
- Trocar o provedor de CI.
- Assinatura/atestação de artefatos (SLSA) — follow-up.

## 4. Requisitos

### RF1 — Dependabot

- `.github/dependabot.yml` com os ecossistemas `npm` e `github-actions`,
  `schedule.weekly`, grupos `minor-patch` (majors abrem individualmente).

### RF2 — CodeQL

- `.github/workflows/codeql.yml` com `github/codeql-action`, linguagem
  `javascript-typescript`, em `push`, `pull_request` e `schedule` semanal.

### RF3 — Pin e permissões

- Toda action referenciada por **SHA** (com comentário da versão).
- `permissions: contents: read` no topo de cada workflow (mínimo privilégio).

### RF4 — Auditoria de dependências

- `npm audit --omit=dev --audit-level=high` como gate; o de dev é informativo.

**Não-funcionais**
- RNF1 — Sem aumento perceptível do tempo do CI no caminho crítico.
- RNF2 — CodeQL não deve falhar por ruído de código gerado (`dist/`, `out/`).

## 5. Solução proposta

- Novos arquivos `.github/dependabot.yml` e `.github/workflows/codeql.yml`.
- Ajuste dos workflows existentes (`ci.yml`, `integration.yml`, `pages.yml`,
  `wiki.yml`) para SHA + `permissions`.

## 6. Configuração

Nenhuma setting da extensão.

## 7. Plano de testes

- **Validação manual**: abrir um PR de dependência gerado pelo Dependabot;
  confirmar que o CodeQL roda e reporta no Security tab; `npm audit` falha com
  advisory `high` de produção (teste controlado em fork).
- **CI**: `brain:ci`/`docs:check` seguem verdes.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| CodeQL ruidoso em artefatos gerados | Paths ignorados / `paths-ignore` |
| Excesso de PRs do Dependabot | Agrupamento minor/patch semanal |
| Pin por SHA “congela” sem atualização | Dependabot bumpa os pins automaticamente |

## 9. Rollout

- **0.20.0** (patch de infraestrutura; sem mudança de runtime).
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- `dependabot.yml` e `codeql.yml` presentes; CodeQL verde no primeiro run.
- Actions pinadas por SHA; `permissions` escopadas.
- Gate de `npm audit` operante.

## 11. Questões em aberto

- Rodar CodeQL também em `schedule` diário ou só semanal?
- Incluir `github-actions` no mesmo PR de grupo do npm?

## 12. Impacto no cérebro

Na conclusão, criar a regra `BR-PLAT-*` ("actions pinadas por SHA e permissões
escopadas; dependências auditadas no CI"), com `prds: ["PRD-104"]`,
`implementacao:` e `testes:`. Enquanto `proposed`, `regras: []`.
