<!-- GENERATED FROM docs/brain/20-PRDs/prd-119-security-posture-scorecard.md — DO NOT EDIT -->

# PRD-119 — Postura de segurança verificável: OSSF Scorecard e proteção de `main`

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-13 |
| Componente | Segurança e CI do repositório (`.github/`) |
| Versão alvo | 0.18.0 |
| Arquivos afetados | `.github/workflows/scorecard.yml` (novo), configuração de *branch protection* no GitHub (fora do repositório), `docs/brain/**`, `SECURITY.md` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-104 (cadeia de suprimentos), PRD-118 (assinatura de commits), PRD-81 (segurança), PRD-83 (higiene do VSIX) |

## 1. Resumo

Uma auditoria externa (**VSCan**) do `.vsix` 0.15.0 atribuiu **86/100 (“medium”)** e
penalizou **−5 no módulo `ossfScorecard`** porque o OpenSSF não encontra resultado
algum para o repositório (`OSSF API request failed … Project or commit not found`).
O repositório é público e já tem CodeQL (*default setup*), mas **nada produz uma
nota de postura de segurança auditável de fora** e o `main` **não tem proteção de
branch**. Esta PRD publica o **OSSF Scorecard** e protege o `main`, fechando o
único sinal “medium” do relatório que depende apenas de configuração.

## 2. Contexto e problema

O relatório do VSCan (14/10/2026, VSIX 0.15.0) trouxe três módulos “medium”: dois
de metadados (popularidade/publisher — PRD-122) e o **`ossfScorecard`**. Neste, a
nota caiu porque:

```text
mainRepoResult.scoreResult.error:
"OSSF API request failed for github.com/thepaneb/vscode-utplsql (Latest).
 Project or commit not found."
```

O OpenSSF Scorecard publica resultados para repositórios que **rodam a action**
(`ossf/scorecard-action` com `publish_results: true`). Sem isso, o repo fica
invisível para o `securityscorecards.dev`, para o VSCan e para qualquer auditoria
externa que consulte essa fonte — mesmo sendo público e tendo CI.

O que **já existe** (não duplicar):

- **PRD-104** — Dependabot, *pin* de actions por SHA, `permissions` escopadas e
  triagem dos alertas do CodeQL. Isso cobre dois checks do Scorecard
  (*Pinned-Dependencies*, *Token-Permissions*) e o *SAST*.
- **PRD-118** — assinatura de commits e verificação de origem no `main`.
- **CodeQL** rodeando por *default setup* (javascript-typescript, actions, python).
- `SECURITY.md` versionado (política de segurança do repositório).

O que **falta**: (a) resultados do Scorecard publicados; (b) *branch protection*
no `main` — hoje um *push* direto é aceito (o próprio fluxo do projeto alterna
entre PRs e commits diretos).

Por que importa: a nota do OSSF é o sinal que **terceiros** (VSCan, Marketplace,
adotantes) conseguem verificar sozinhos; e os seus checks empurram justamente as
boas práticas já inlineadas na PRD-104, com benefício mútuo.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Publicar resultados do **OSSF Scorecard** para `github.com/thepaneb/vscode-utplsql`
  (`publish_results: true`), numa cadência semanal e em mudança das regras de branch.
- **Proteger o `main`**: sem *push* direto, *status checks* obrigatórios, sem
  *force-push*/exclusão, histórico linear e commits assinados (PRD-118).
- Fazer a nota do Scorecard aparecer de forma **resolvível** (viewer OSSF + VSCan),
  removendo a penalidade de −5 do relatório externo.

**Não-objetivos**
- Recriar o Dependabot, o *pin* de actions ou o `npm audit` (PRD-104).
- Criar `.github/workflows/codeql.yml` — a PRD-104 decidiu manter o *default setup*.
- Perseguir score máximo às cegas: checks de baixo valor para este projeto
  (ex.: *Fuzzing*, *CI-Tests*) serão **dispensados com justificativa**.
- Atestação de artefatos (SLSA *provenance*): a PRD-104 já o declarou *follow-up*.

## 4. Requisitos

### RF1 — Workflow do OSSF Scorecard

Adicionar `.github/workflows/scorecard.yml` com `ossf/scorecard-action`:

- disparo: `schedule` (semanal), `push` em `main` e `branch_protection_rule`;
- `permissions: read-all` no topo; no job, apenas
  `security-events: write`, `id-token: write`, `contents: read`, `actions: read`;
- `persist-credentials: false` no `actions/checkout`;
- `publish_results: true` (exige repo público e `id-token: write`);
- publicar o SARIF via `github/codeql-action/upload-sarif`;
- actions **pinadas por SHA** (PRD-104) — se esta PRD landar primeiro, já pina estas.

### RF2 — `main` protegido

Habilitar *branch protection* (ou *ruleset*) em `main`:

- **exigir pull request** (proibir *push* direto);
- **status checks obrigatórios**: `ci`, `integration` (quando aplicável) e as
  análises do CodeQL;
- proibir *force-push* e exclusão da branch;
- exigir histórico linear (*merge/squash*) e **commits assinados** (PRD-118);
- política de revisão compatível com mantenedor único: **não exigir aprovação
  própria** (ou *bypass* de admin documentado) para não travar o dono do repo.

### RF3 — Triagem dos checks remanescentes

Ao publicar a primeira nota, **cada** check com score baixo entra numa tabela de
triagem (fechar ou dispensar com justificativa rastreável no Security tab), no
mesmo espírito da RF5 da PRD-104. Exemplos esperados: *Signed-Releases*
(depende do `publish.yml`), *Branch-Protection* (RF2), *CII-Best-Practices*
(aderir ao badge é opcional).

### RF4 — Verificação externa

Confirmar que a nota passa a ser **resolvida** pelos consumidores externos:
`securityscorecards.dev/viewer/?uri=github.com/thepaneb/vscode-utplsql` e o módulo
`ossfScorecard` do VSCan (re-scan).

### RF5 — Registro no cérebro

Documentar a decisão (workflow + branch protection) no vault: atualizar
`SECURITY.md`/nota de segurança e registrar a regra `BR-PLAT-002` (ver §12). O
README **não** muda (nada visível ao usuário).

**Não-funcionais**
- RNF1 — O workflow não introduz segredos nem permissões acima das listadas; sem
  *write* em `contents`.
- RNF2 — O job não roda no caminho crítico de PRs (cadência semanal + eventos
  específicos), sem custo perceptível no CI dos PRs.
- RNF3 — Nenhum *push* direto em `main` deixa de ser possível por acidente: a
  proteção é verificada por um *push* de teste rejeitado.

## 5. Solução proposta

```yaml
name: Scorecard
on:
  branch_protection_rule:
  schedule: [{ cron: '30 4 * * 1' }]
  push: { branches: [main] }
permissions: read-all
jobs:
  analysis:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      id-token: write
      contents: read
      actions: read
    steps:
      - uses: actions/checkout@<sha>          # persist-credentials: false
      - uses: ossf/scorecard-action@<sha>     # publish_results: true
        with: { results_file: results.sarif, results_format: sarif, publish_results: true }
      - uses: actions/upload-artifact@<sha>
      - uses: github/codeql-action/upload-sarif@<sha>
```

A *branch protection* é configuração do GitHub (não versionável no repositório);
o PRD registra o conjunto exato de regras no vault para que seja reproduzível e
auditável (mesmo tratamento dado às permissões da PRD-104).

## 6. Configuração

Nenhuma setting da extensão. Configuração no GitHub (workflow + *ruleset*).

## 7. Plano de testes

- **Validação manual**: `workflow_dispatch` do Scorecard → job verde e resultado no
  viewer do OSSF; *push* direto em `main` rejeitado; PR sem checks verdes
  bloqueado.
- **Externo**: re-scan no VSCan → `ossfScorecard` deixa de penalizar e
  `mainRepoResult.scoreResult.error` fica `null`.
- **CI**: `brain:ci`/`docs:check` seguem verdes.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `publish_results: true` falhar (repo/escopo) | Confirmar repo público e `id-token: write`; testar via *dispatch* antes do merge |
| Proteção de `main` travar o mantenedor único | Não exigir aprovação própria; manter *bypass* documentado se necessário |
| Ruído de checks irrelevantes (Fuzzing, CI-Tests) | RF3: dispensar com justificativa, não “caçar” score |
| Sobreposição com PRD-104/118 | Escopo lido em conjunto: 104 pin/audit/CodeQL, 118 assinatura, 119 *scorecard* + branch protection |
| Novos pins “congelam” sem atualização | Dependabot (PRD-104) bumpa os pins do *scorecard* automaticamente |

## 9. Rollout

- **0.18.0** — infraestrutura, sem mudança de runtime; entra junto de PRD-104/118.
- Registrar no `CHANGELOG.md` (seção da versão).
- Sem migração para o usuário.

## 10. Critérios de aceite

- `scorecard.yml` presente, pinado e verde; resultado publicado.
- `securityscorecards.dev` resolve a nota do repositório (API do OSSF sem erro).
- `main` protegido: *push* direto rejeitado; checks obrigatórios ativos.
- Triagem (RF3) registrada para todo check com score baixo.
- Re-scan do VSCan sem a penalidade de `ossfScorecard`.
- `BR-PLAT-002` criada e `SECURITY.md` atualizado.

## 11. Questões em aberto

- Exigir revisão por terceiros (o que exigiria um segundo mantenedor) ou
  manter a política compatível com mantenedor único?
- Vale aderir ao badge *OpenSSF Best Practices* (CII) no README, ou dispensar o
  check por baixo valor para o escopo atual?
- `upload-artifact`+`upload-sarif` no mesmo job, ou separar a publicação do SARIF?

## Decisões (2026-10-29)

- CodeQL permanece no **default setup**; o workflow do Scorecard é o único novo.
- `workflow_dispatch` foi incluído para a validação manual do PRD.
- Branch protection ativada em **2026-10-30**: PR (0 aprovações), checks
  `build (22/24/26)` + `CodeQL`, commits assinados, `enforce_admins=true`;
  **histórico linear não adotado** (o projeto usa merge commits).
- A ação `ossf/scorecard-action` está pinada por SHA (`v2.4.4`, imagem GHCR) e
  o upload SARIF usa `github/codeql-action/upload-sarif` (`v4`), ambos
  atualizados pelo Dependabot (PRD-104).
- Regra **`BR-PLAT-004`** (o `BR-PLAT-002` já é da PRD-104).

## 12. Impacto no cérebro


RNFs sem regra: RNF2, RNF3 (cadência do workflow e verificação de proteção são manuais/externas).
Na conclusão, criar a regra **`BR-PLAT-004`** — “o CI publica o OSSF Scorecard e o
`main` é protegido (PR, checks obrigatórios, sem force-push)” — com
`prds: ["PRD-119"]`, `implementacao:` (`.github/workflows/scorecard.yml` +
configuração do repo) e `testes:` (verificação manual documentada; sem teste
unitário, pois é configuração externa — declarar a exceção). Avaliar se
`SECURITY.md`/nota de segurança ganham menção à postura auditável.
Enquanto `proposed`, `regras: []`.

## Impacto nas docs

`wiki/Contributing.md` documenta a postura de segurança; o CHANGELOG entra no release.
