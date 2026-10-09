---
tipo: guia
status: ativo
verificado: 2026-10-09
tags: [brain, opencode, agentes, mcp, skills, seguranca]
---

# Guia — ferramentas de agente (MCPs, skills e plugins)

Ferramentas do agente (OpenCode) usadas neste repositório: MCPs, skills e o
status dos plugins. A configuração versionada fica em
[`opencode.json`](../../../opencode.json); as skills externas em
[`.agents/skills/`](../../../.agents/skills) (registradas em
[`skills-lock.json`](../../../skills-lock.json)); as skills do projeto em
`.opencode/skills/`.

## MCPs

| Servidor | Tipo | Uso |
|---|---|---|
| `obsidian` | local | lê/escreve o vault `docs/brain` |
| `context7` | remoto | docs atualizadas (VS Code API, node-oracledb, fast-xml-parser, TypeScript, Biome) |
| `github` | remoto | issues/PRs/releases; PAT via `{env:GITHUB_TOKEN}` (`oauth: false`) |
| `playwright` | local (Docker) | testar a landing page (`site/`) e acessibilidade |

- **GitHub**: o OAuth **não funciona** (o GitHub não suporta *dynamic client
  registration*). O PAT precisa estar no **processo do serviço**:
  `opencode service set env GITHUB_TOKEN <pat>` + `opencode service restart`
  (alternativa: `export GITHUB_TOKEN=…` antes de iniciar o OpenCode).
- **MCPs locais via `npx`** não sobem no serviço em background do WSL (o `npx`
  do Windows não é spawnável ali) — por isso o `playwright` usa **Docker**
  (`mcr.microsoft.com/playwright/mcp`).

## Permissões (guard de `.env`)

O OpenCode V2 já faz `ask` em `*.env`/`*.env.*`; o projeto endurece para `deny`
em `read`/`edit`, liberando `*.example` (bloco `permissions` do `opencode.json`).
O `shell` **não** é coberto (matching best-effort) — evite `cat .env`.

## Plugins (V1 ≠ V2)

Nenhum plugin de terceiros: `envsitter-guard` e `opencode-log-sanitizer` são da
API **V1** e não carregam no OpenCode V2; `opencode-worktree` está aposentado
(V1-only). Em substituição:

- guard de `.env` → **permissões nativas** (acima);
- sanitização de logs → plugin **local V2**
  [`log-sanitizer`](../../../.opencode/plugins/log-sanitizer/index.ts), que
  redige JWT/bcrypt/base64/strings longas dos prompts.

## Agentes (`.opencode/agent/`)

Subagentes do projeto (carregados a partir do restart do serviço):

| Agente | Papel |
|---|---|
| `oracle-analyst` | diagnostica setup Oracle/utPLSQL (grants, objetos inválidos, schema) — read-only |
| `i18n-reviewer` | paridade das 24 locales (README, `package.nls.*`, `i18nLocales.ts`) — read-only |
| `security-auditor` | auditoria de segurança do código e do CI — read-only |
| `release-manager` | checklist de publicação ponta a ponta |
| `li-post-writer` | posts do LinkedIn (usa a skill `linkedin-posts`) |
| `docs-auditor` | auditoria semântica da documentação (já existente) |

## Skills externas

- `cartographer` — mapeia o código em `docs/CODEBASE_MAP.md` (commitável).
- `brainstorming`, `writing-plans`, `using-git-worktrees`, `requesting-code-review`,
  `receiving-code-review`, `finishing-a-development-branch` (de `obra/superpowers`).
- `research`, `domain-modeling`, `writing-for-agents` (de `mattpocock/skills`).

## Verificação

```sh
opencode mcp list      # 4 servidores connected
opencode plugin list   # log-sanitizer (local)
```

## Conexões

- 🗺️ [[MOC - Stack]]
