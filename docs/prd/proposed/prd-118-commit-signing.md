<!-- GENERATED FROM docs/brain/20-PRDs/prd-118-commit-signing.md — DO NOT EDIT -->

# PRD-118 — Assinatura de commits e verificação de origem no `main`

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-13 |
| Componente | Governança do repositório (configuração local do mantenedor + *branch protection* do `main`) |
| Versão alvo | 0.18.0 |
| Arquivos afetados | `CONTRIBUTING.md`, `docs/brain/**` (o restante é configuração `git`/GitHub, fora do repositório) |
| Esforço estimado | 0,5 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-104 (cadeia de suprimentos do CI), PRD-110 (hardening defensivo), PRD-81 (segurança) |

## 1. Resumo

Ativar **assinatura de commits** (git) no lado do mantenedor e **exigir commits
assinados** no `main` via *branch protection*, de modo que a origem de cada
commit publicável seja verificável no GitHub. É o único ponto levantado numa
auditoria externa de saúde do repositório (2026-10-13) que ainda **não tinha
PRD** — os demais já estavam cobertos por PRD-104/110.

## 2. Contexto e problema

- Uma auditoria externa ("NxCode GitHub Repo Health Checker", 2026-10-13) apontou
  como lacuna de segurança: *"Only 2/10 commits signed"*. É factualmente parcial,
  mas o fundo é real.
- Estado medido: `git config commit.gpgsign` **não** está definido; nos últimos
  50 commits apenas 17 têm assinatura presente (majoritariamente *merges* criados
  pelo próprio GitHub); no histórico completo são 67/502 (~13%).
- **Não há exigência de commits assinados** no `main` (o repositório é público).
- A assinatura é **ortogonal ao push**: o `git push` já usa o `credential.helper`
  com o token como `x-access-token`, apenas para autenticação. Assinar é uma
  configuração local e **não** conflita com o fluxo atual.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Assinar commits (e tags de release) localmente.
- Exigir commits assinados no `main` via *branch protection*.
- Documentar o procedimento em `CONTRIBUTING.md` e registrar a decisão no vault.

**Não-objetivos**
- Assinatura/atestação de **artefatos** (SLSA) — é follow-up da PRD-104, não dos
  commits.
- Reescrever o histórico para assinar commits antigos.
- Obrigar contribuidores externos a assinar além do que a *branch protection* já
  impõe (o GitHub rejeita o merge; o processo de revisão segue igual).

## 4. Requisitos

### RF1 — Assinatura local (SSH, preferida)

- Configurar assinatura por **SSH** (usa a mesma chave de acesso ao GitHub, sem
  gerenciar um par GPG adicional):
  `git config gpg.format ssh` · `git config user.signingkey <chave>` ·
  `git config commit.gpgsign true` · `git config tag.gpgsign true`.
- Adicionar a chave pública no GitHub como **Signing Key** (separada da
  *Authentication Key*), senão os commits aparecem como não verificados.
- Alternativa equivalente: **GPG** (`user.signingkey` + chave no keyring). A
  escolha fica registrada na §11.

### RF2 — Branch protection do `main`

- Habilitar **Require signed commits** na proteção do `main`, preservando as
  demais regras já ativas.
- Confirmar que *merges* criados pelo GitHub (botão "Merge pull request") e PRs
  do Dependabot continuam aceitos (o GitHub assina suas próprias operações); se
  algum bot legítimo não assinar, liberar **bypass pontual** apenas para ele.

### RF3 — Documentação

- `CONTRIBUTING.md`: nova subseção **"Commit signing"** em *Commit conventions*
  (como configurar e verificar).
- `docs/brain/**`: nota/regra refletindo a decisão (ver §12).

### RF4 — Verificação

- `git log --show-signature -1` mostra `Good signature` localmente.
- A UI do GitHub exibe **Verified** nos commits novos do `main`.

**Não-funcionais**
- RNF1 — O fluxo de `git push` via token não muda (assinatura é local).
- RNF2 — Nenhuma mudança no `package.json`, runtime da extensão ou no `.vsix`.

## 5. Solução proposta

- Rodar os `git config` do RF1 na máquina do mantenedor (WSL) e subir a chave
  pública de assinatura no GitHub.
- Ligar "Require signed commits" em *Settings → Branches* para o `main`.
- Documentar em `CONTRIBUTING.md` e registrar a regra no vault.

## 6. Configuração

Nenhuma setting da extensão; apenas configuração `git`/GitHub.

## 7. Plano de testes

- **Validação manual**: novo commit → `git log --show-signature` (`Good
  signature`) e badge **Verified** no GitHub; `git push` via token segue
  funcionando.
- **Validação manual (proteção)**: PR com commit não assinado é recusado pelo
  `main`; PR com commit assinado é aceito; merge pelo GitHub e PR do Dependabot
  continuam aceitos.
- **CI**: `brain:ci`/`docs:check` seguem verdes.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Chave de assinatura diferente entre Windows e WSL | Usar a mesma chave; documentar o caminho (`~/.ssh/…`) e validar com `git log --show-signature` |
| Commit de bot (Dependabot/api) recusado pela proteção | O GitHub assina seus próprios commits; se necessário, liberar bypass pontual |
| Chave apenas de autenticação, não de assinatura | Adicionar a chave pública como *Signing Key* no GitHub |
| Assinatura quebrar algum script/CI que parseia `git log` | Nenhum script depende de `%G?`; validar `brain:ci` |

## 9. Rollout

- **0.18.0** (infra/governança; sem mudança de runtime).
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- `commit.gpgsign=true` (e `tag.gpgsign=true`) local; commits novos exibem
  **Verified** no GitHub.
- `main` exige commits assinados, sem quebrar merges do GitHub nem PRs do
  Dependabot.
- `CONTRIBUTING.md` documenta o procedimento.
- Nenhuma regressão no `git push` nem no `brain:ci`.

## 11. Questões em aberto

- **SSH** (recomendado — reaproveita a chave existente) **ou GPG** para assinar?
- Exigir também **tags** assinadas (o `publish.yml` dispara em `release:
  published`, criado pela API — tags assinadas são só higiene local)?
- Algum bot do repositório precisa de bypass explícito?

## 12. Impacto no cérebro

Ao concluir, criar a regra que materializa a PRD, por exemplo uma `BR-PLAT-*`
("commits no `main` são assinados e verificados"), com `prds: ["PRD-118"]`,
`implementacao:` (arquivo/ponto de configuração) e `testes:`. Enquanto
`proposed`, `regras: []`.
