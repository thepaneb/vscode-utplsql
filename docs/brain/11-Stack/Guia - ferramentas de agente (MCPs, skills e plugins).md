---
tipo: guia
status: ativo
verificado: 2026-10-16
implementacao: ["scripts/obsidian-mcp.py", "scripts/obsidian-portproxy.cmd", ".gitattributes"]
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
- **Obsidian (WSL → Windows)** — o bridge `scripts/obsidian-mcp.py` roda no WSL e
  fala com o plugin **Local REST API** do Windows em `http://<gateway>:27123`
  (gateway = `ip route show default | awk '{print $3}'`). Como o plugin só escuta
  em `127.0.0.1`, o caminho depende de `netsh interface portproxy`
  (`<gateway>:27123 → 127.0.0.1:27123`) + regra de firewall para a sub-rede do
  WSL (ex.: `remoteip=172.21.16.0/20`).
  - **Armadilha:** o portproxy **não** é resiliente. Quando o adaptador do WSL é
    recriado (reinício do Windows, atualização) a regra permanece no registro e o
    `iphlpsvc` segue rodando, mas **não vincula** o listener — e a porta passa a
    ser **recusada**, inclusive com a sub-rede **igual** à original (não é só
    “quando a sub-rede muda”).
  - **Sintoma:** `opencode mcp list` → `✗ obsidian failed: Request timed out`.
  - **Diagnóstico:** do WSL o TCP/HTTP morre (`curl -m5 http://<gateway>:27123/`
    → sem resposta), enquanto no Windows o plugin escuta normalmente
    (`netstat -ano | findstr 27123` → só `127.0.0.1:27123`) e
    `Test-NetConnection <gateway> -Port 27123` → `False` (para `127.0.0.1`, `True`).
  - **Correção em um clique:** `scripts\obsidian-portproxy.cmd` (duplo-clique; pede
    UAC). O script descobre o IPv4/prefixo do adaptador do WSL, reaplica o
    portproxy com `delete` + `add` (força o re-bind) e recria a regra de firewall
    para a sub-rede atual. O `.cmd` é garantido em CRLF pelo `.gitattributes`
    (`*.cmd text eol=crlf`), para o `cmd.exe` não se perder nos blocos `for`.
  - **Na mão (PowerShell como administrador)** — equivalente ao script:
    ```powershell
    netsh interface portproxy delete v4tov4 listenaddress=<gateway> listenport=27123
    netsh interface portproxy add v4tov4 listenaddress=<gateway> listenport=27123 connectaddress=127.0.0.1 connectport=27123
    ```
    Conferir: `netstat -ano | findstr 27123` passa a listar
    `<gateway>:27123 LISTENING` (dono: `iphlpsvc`).
  - **Sem reiniciar o serviço** (a falha fica em cache e só um novo serviço a
    limpa): reconecte pela API interna —
    `POST http://127.0.0.1:<porta>/api/experimental/mcp/obsidian/connect?location[directory]=<projeto>`
    com **Basic auth** (`opencode:<password>`, de `~/.config/opencode/service.json`;
    a porta sai de `opencode service status`). Descubra as rotas em
    `GET /openapi.json` (a lista usa `GET /api/mcp?location[directory]=<projeto>`).
  - **Alternativa definitiva:** `networkingMode=mirrored` no `.wslconfig` — com
    rede espelhada o `127.0.0.1` do WSL alcança o Windows e o portproxy deixa de
    ser necessário (`OBSIDIAN_HOST=127.0.0.1` para o bridge).
  - **Segurança:** `opencode service get` imprime o `env` do serviço em claro
    (inclui o `GITHUB_TOKEN`) — inspecione com
    `opencode service get | jq '.env | keys'` e rotacione o PAT se ele vazar.

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
| `oracle-analyst` | diagnostica setup Oracle/utPLSQL (grants, objetos inválidos, schema) via `docker exec`+`sqlplus` no container local — read-only |
| `i18n-reviewer` | paridade das 24 locales (README, `package.nls.*`, `i18nLocales.ts`) — read-only |
| `security-auditor` | auditoria de segurança do código e do CI — read-only |
| `release-manager` | checklist de publicação ponta a ponta |
| `li-post-writer` | posts do LinkedIn (usa a skill `linkedin-posts`) |
| `docs-auditor` | auditoria semântica da documentação (já existente) |

## Skills externas

Todas em `.agents/skills/` e registradas em `skills-lock.json` (24 no total).

- **`cartographer`** — mapeia o código em `docs/CODEBASE_MAP.md` (commitável).
- **`obra/superpowers`** — `brainstorming`, `writing-plans`, `executing-plans`,
  `subagent-driven-development`, `using-git-worktrees`, `requesting-code-review`,
  `receiving-code-review`, `finishing-a-development-branch`,
  `verification-before-completion`, `systematic-debugging`, `writing-skills`.
- **`mattpocock/skills`** — `code-review`, `diagnosing-bugs`, `implement`,
  `research`, `domain-modeling`, `codebase-design`, `grilling`,
  `improve-codebase-architecture`, `prototype`, `retro`, `handoff`,
  `writing-for-agents`.

## Verificação

```sh
opencode mcp list      # 4 servidores connected
opencode plugin list   # log-sanitizer (local)
```

## Conexões

- 🗺️ [[MOC - Stack]]
