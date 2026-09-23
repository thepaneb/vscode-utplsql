# PRD-85 — Second brain canônico (Obsidian) com MCP e extração de conhecimento

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-23 |
| Componente | Ferramental de desenvolvimento / documentação (`docs/`, `scripts/`) |
| Versão alvo | 0.17.0 |
| Arquivos afetados | `.gitignore`, `opencode.json` (novo), `scripts/brain.cjs`, `scripts/brain-build.cjs` (novo), `scripts/brain-rules.cjs` (novo), `scripts/docs-check.cjs`, `scripts/docs-fidelity.cjs`, `scripts/sync-prds.cjs`, `AGENTS.md`, `docs/brain/**`, `docs/functional/**`, `docs/wiki/**`, `docs/prd/**`, `README.md` + variantes, `.github/workflows/*` |
| Esforço estimado | 3–5 dias (multi-fase) |
| Complexidade | Alta |

## 1. Resumo

Transformar `docs/brain/` de um **índice local gitignored** em **fonte da verdade
versionada** do conhecimento do projeto, e inverter o pipeline de documentação:
o vault passa a ser a superfície canônica de edição e os artefatos do repo
(`README*`, `docs/wiki/`, `docs/functional/`, `docs/prd/`) passam a ser **gerados**
a partir dele. O conhecimento é persistido em **unidades mínimas** — regras de
negócio atômicas (`BR-*`) mais camadas de arquitetura, padrões, stack,
dependências, componentes de terceiros, glossário, erros, NFRs e segurança — com
rastreabilidade para código, teste e PRD. O agente lê/escreve o vault via **MCP do
Obsidian** (servidor embutido no plugin Local REST API).

## 2. Contexto e problema

O fluxo atual é **repo → vault**: `scripts/brain.cjs sync` lê o repo e injeta
índices nos MOCs, e `docs/brain/` é gitignored ("cada dev gerencia o seu"). O repo
é declarado fonte da verdade em `AGENTS.md` e na skill `docs-fidelity`.

Problemas observados no estado atual:

1. **Conhecimento fragmentado.** As mesmas informações aparecem em
   `docs/functional/` (11 documentos), `docs/wiki/` (24 páginas), `README.md` e
   23 variantes, `AGENTS.md` e PRDs — e driftam entre si.
2. **Sem unidades atômicas de regra de negócio.** Comportamentos invariantes
   (ex.: precedência da conexão, parse de reporter sem `.trim()`, cancelamento via
   `conn.break()`) só existem como prosa no código/`AGENTS.md`, não como regras
   verificáveis e testáveis com ID estável.
3. **Rastreabilidade inexistente.** Não há como responder "qual regra governa este
   teste?", "por que esta dependência existe?", "quais regras dependem deste
   componente?".
4. **i18n sem glossário.** Com 23 idiomas (`README.*.md` + `package.nls.*.json`),
   não há linguagem ubíqua compartilhada; traduções divergem de jargão.
5. **Vault subaproveitado.** O vault não é compartilhado entre devs nem lido pela
   CI; é apenas uma visualização local.

O estado atual suporta essa mudança: já existem `docs-check.cjs` (consistência
estrutural), `docs-fidelity.cjs` (fidelidade código↔docs), `sync-prds.cjs`
(PRDs↔issues) e o tool `brain.cjs` — todos reaproveitáveis/reorientáveis.

## 3. Objetivos / Não-objetivos

**Objetivos**

- Tornar `docs/brain/` a **fonte canônica versionada** de todo conteúdo escrito por
  humanos, com o repo gerado a partir dele.
- Persistir regras de negócio como **unidades mínimas** (`BR-*`), uma por nota.
- Ampliar o modelo de conhecimento com camadas: `NFR-*`, `ENT-*`, `GLOSS-*`,
  `ERR-*`, `SEC-*`, `PAT-*`, `DEP-*`, `TPL-*`, `LOC-*`, `PIPE-*`.
- Estabelecer **rastreabilidade** `BR ↔ código ↔ teste ↔ PRD ↔ dependência/padrão`.
- Disponibilizar o vault ao agente via **MCP** (Local REST API, servidor embutido).
- Manter `docs:check`/`docs:fidelity` rodando no CI, agora validando a saída gerada
  e as unidades do vault (com fallback em arquivo, sem depender do Obsidian aberto).

**Não-objetivos**

- Gerar as tabelas de settings/comandos/keybindings a partir do vault — são fatos
  do código e continuam fluindo **código → vault**.
- Criar nota por dependência transitiva, SBOM ou análise jurídica de licenças.
- Substituir testes, CodeLens ou os PRDs existentes; a camada de regras complementa.
- Análise competitiva / marketing (`docs/analise-comparativa.md` fica fora do escopo).
- Grafo de imports automático completo (avaliado como fase tardia opcional).

## 4. Requisitos

### RF1 — Vault versionado como fonte canônica

`docs/brain/` deixa de ser gitignored e passa a ser commitado, com regras de
`.gitignore` para não versionar segredos/estado:

```gitignore
!docs/brain/
!docs/brain/**
docs/brain/.obsidian/workspace*.json
docs/brain/.obsidian/plugins/*/main.js
docs/brain/.obsidian/plugins/*/styles.css
docs/brain/.obsidian/plugins/obsidian-local-rest-api/data.json
docs/brain/.trash/
docs/brain/90-Daily/
```

### RF2 — MCP do Obsidian no opencode

Configuração do MCP no `opencode.json` do projeto, **sem segredos** (substituição
por variável de ambiente):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "obsidian": {
      "type": "remote",
      "url": "http://{env:OBSIDIAN_HOST}:27123/mcp/",
      "headers": { "Authorization": "Bearer {env:OBSIDIAN_API_KEY}" },
      "enabled": true
    }
  }
}
```

Pré-requisito: plugin comunitário **Local REST API** instalado e com o endpoint HTTP
habilitado (`Settings → Local REST API → Enable HTTP server`). O servidor MCP é
embutido no plugin (não requer servidor terceiro).

> **WSL/Windows:** Obsidian roda no Windows e o agente no WSL. `127.0.0.1` do WSL
> não alcança o host por padrão. Opções, em ordem: (1) WSL2 com
> `networkingMode=mirrored`; (2) `netsh interface portproxy` no Windows + regra de
> firewall; (3) rodar o opencode no Windows. Validar antes da migração de conteúdo.

### RF3 — `brain:sync` (código → vault)

Reaproveitar `scripts/brain.cjs sync` para injetar **fatos do código** nos
auto-blocks das notas do vault: stack/`engines`, `activationEvents`/`contributes`,
dependências diretas (versão, escopo, licença, major disponível), workflows/CI.
Mantém a idempotência e o `brain:check`.

### RF4 — `brain:build` (vault → repo)

Novo gerador que produz os artefatos do repo a partir do vault:

- `docs/functional/*.md` → view agregando regras por domínio;
- `docs/wiki/*.md` → notas com frontmatter `publicar: wiki`;
- `docs/prd/**` + `index.md` → notas `20-PRDs/` (status no frontmatter);
- `README.md` + variantes → notas `60-README/`.

Todo arquivo gerado recebe banner
`<!-- GENERATED FROM docs/brain/... — DO NOT EDIT -->`.

### RF5 — Regras de negócio atômicas (`BR-*`)

Uma nota por regra, com ID estável e critérios de atomicidade (sujeito único,
testável, sem mistura). Contrato de frontmatter:

```yaml
---
id: BR-CONN-001
tipo: regra
titulo: Precedência da conexão
dominio: conexao
status: ativo          # ativo | proposta | obsoleto | em_disputa
severidade: critica    # critica | alta | media | baixa
fonte: codigo          # codigo | prd | stakeholder | convencao
versao_desde: 0.13.0
verificado: 2026-09-23
implementacao: [src/config.ts:120]
testes: [src/test/unit/config.test.ts:88]
prds: [PRD-66]
tags: [conexao, seguranca]
---
```

Corpo: enunciado, pré-condições, exceções, justificativa, exemplos e
contra-exemplos. `fonte: codigo` é a origem primária; PRD entra como contexto.

### RF6 — Camadas complementares

Notas atômicas adicionais, com contratos próprios:

| Tipo | ID | Origem |
|---|---|---|
| Requisito não-funcional | `NFR-*` | curada + gerada (`engines`) |
| Entidade de domínio | `ENT-*` | curada + gerada (`types.ts`) |
| Glossário / linguagem ubíqua | `GLOSS-*` | curada |
| Catálogo de erros (`ORA-*`) | `ERR-*` | curada + gerada (códigos no `src/`) |
| Segredos / invariantes de segurança | `SEC-*` | curada + gerada (grep) |
| Padrão de projeto/sistema | `PAT-*` | curada |
| Dependência direta | `DEP-*` | gerada |
| Componente de terceiros | `TPL-*` | curada |
| Locale/i18n | `LOC-*` | gerada |
| Workflow/CI | `PIPE-*` | gerada |

### RF7 — Rastreabilidade

Relações navegáveis no vault:

```
BR-*  ──implementa──►  código  ──usa──►  DEP-*/TPL-*
  ▲                        ▲
  └── ADR-* / PRD-*        └── PAT-* (padrões aplicados)
```

Derivadas: regras sem teste (lacuna), regras sem código (proposta/obsoleta),
notas órfãs, traduções defasadas.

### RF8 — Validações em CI

- `brain-rules check`: schema do frontmatter, IDs únicos, todo
  `implementacao`/`testes`/`prds` resolve, sem regra órfã.
- `brain:build && git diff --exit-code`: barra drift entre vault e repo.
- `docs:check` / `docs:fidelity` adaptados para validar a saída gerada + as notas
  **lendo arquivos direto** (fallback sem Obsidian).
- PRD: `sync-prds.cjs` passa a ler `status:` do frontmatter (não mais a pasta).

### RF9 — Migração do fluxo de PRDs

`docs/prd/**` vira artefato gerado; a pasta deixa de ser a fonte da verdade do
status (passa a ser o frontmatter da nota `20-PRDs/`). O `index.md` e a árvore
**Estrutura** passam a ser produzidos por `brain:build`. A label do GitHub continua
sendo determinada pelo status.

### RF10 — Fallback sem Obsidian

Toda validação/CI opera sobre os arquivos Markdown do vault diretamente. O MCP é
para **autoria** (agente), não para o CI.

**Não-funcionais**

- RNF1 — Sem segredos no repo (`OBSIDIAN_API_KEY`, senha Oracle, token GitHub).
- RNF2 — `brain:sync`/`brain:build` idempotentes (`OK: 0 arquivo(s) atualizado(s)`).
- RNF3 — Compatível com o toolchain WSL/Windows atual (Node via `node.exe`).
- RNF4 — Nenhuma publicação local (`npm run publish` continua bloqueado).

## 5. Solução proposta

### 5.1 Estrutura do vault

```
docs/brain/
  00-Inbox/
  10-Projeto/        # visão geral + arquitetura (MOCs, diagramas)
  11-Stack/          # stack + inventário de dependências (gerado)
  13-Padroes/        # PAT-*
  15-Regras/         # BR-* (flat; views por domínio via Dataview)
  17-Componentes/    # TPL-*
  20-PRDs/           # notas PRD canônicas
  30-Decisoes/       # ADRs
  40-Bugs/
  50-Snippets/
  60-README/         # origem do README + variantes
  70-Wiki/           # páginas publicáveis
  90-Daily/
  _templates/
```

### 5.2 Pipeline

```
docs/brain/ (fonte) ──brain:build──► README*, docs/wiki, docs/functional, docs/prd
        ▲                                              │
        └──────── brain:sync (fatos do código) ────────┘
```

### 5.3 Extração de regras

Code-first, com curadoria:

1. Minerar `src/**`, `package.json`, pontos de atenção do `AGENTS.md`, PRDs e
   `docs/functional`.
2. Decompor invariantes em candidatos atômicos.
3. Curadoria: dedupe, split de regras largas, atribuição de ID, links.
4. Gate: regra sem `implementacao` (e sem `testes` quando testável) vira pendência.
5. Passo obrigatório na skill `docs-fidelity`: toda mudança de feature/PRD
   extrai/atualiza regras.

### 5.4 Ajustes em scripts existentes

- `brain.cjs`: geradores de stack/deps/workflows; direção mantida (repo→vault).
- `docs-check.cjs`: incluir validador de regras; considerar a saída gerada.
- `docs-fidelity.cjs`: verificar `implementacao: arquivo:linha` (arquivo existe;
  linha opcional via `--check-lines`).
- `sync-prds.cjs`: ler status do frontmatter da nota.

## 6. Configuração

- `opencode.json` (novo, versionado): MCP `obsidian` (RF2).
- Variáveis de ambiente locais: `OBSIDIAN_API_KEY`, `OBSIDIAN_HOST` (não commitadas).
- `package.json` scripts: `brain:build`, `brain:rules` (aliases de
  `scripts/brain-build.cjs` / `scripts/brain-rules.cjs`).
- Plugin Obsidian **Local REST API** (endpoint HTTP habilitado).

## 7. Plano de testes

- **Unitários** (`node --test`): geradores de `brain-build` (vault→string),
  parser/validador de regras (`brain-rules`), com fixtures em memória; manter
  cobertura ≥ thresholds do `.c8rc`.
- **Integração**: `docs:check` + `docs:fidelity` sobre a saída gerada; teste de
  drift (`build` idempotente).
- **Validação manual**: conexão MCP (listar/ler/criar nota), WSL↔Windows, fallback
  com Obsidian fechado.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Rede WSL↔Windows / TLS self-signed impede o MCP | Validar na Fase 1 (portão); usar HTTP 27123; mirrored networking ou portproxy |
| Duas cópias (vault canônico + repo gerado) → drift | Banner `GENERATED DO NOT EDIT` + `brain:build && git diff --exit-code` no CI |
| 23 traduções geradas do vault multiplicam manutenção | Fase posterior; marcador ⚠️ de defasagem por locale |
| Segredos versionados (`data.json` do plugin, `.env`) | `.gitignore` explícito; `SEC-*` audita; CI verifica |
| Mover a verdade do status de PRD (pasta → frontmatter) quebra `sync-prds` | Reescrever `sync-prds.cjs` na mesma fase; testes unitários |
| Granularidade de regra (larga demais/duplicada) | Critérios de atomicidade + gate de pendências + IDs estáveis |
| Custo de curadoria da extração | Extração assistida via MCP + revisão; começar por domínios críticos |
| Dependência do app aberto | Validação/CI por arquivo (RF10) |
| `.obsidian/` churn e binários no commit | Versionar só config; ignorar `workspace*`, binários de plugin e `data.json` |
| Regressão do princípio atual ("repo é fonte da verdade") | Atualizar `AGENTS.md` e skill `docs-fidelity` na mesma entrega |

## 9. Rollout

- **Versão alvo:** 0.17.0 (ferramental/documentação; acompanha a release).
- **Fases:**
  1. ADR-002 + PRD-85 (esta).
  2. MCP funcionando (plugin + `opencode.json` + smoke test) — **portão de decisão**.
  3. Versionar o vault (`.gitignore`, poda de `.obsidian/`).
  4. Migrar conteúdo canônico (functional/wiki/PRD/README) + extrair regras e camadas.
  5. `brain:build` + banners + adaptar `sync-prds`.
  6. CI drift + `docs:check`/`docs:fidelity` + `wiki.yml`.
  7. Reescrever `AGENTS.md`, skill `docs-fidelity`, `docs/brain/README.md`,
     `CONTRIBUTING.md`.
- **CHANGELOG.md:** registrar como mudança de infraestrutura/documentação.

## 10. Critérios de aceite

- [ ] `opencode.json` conecta ao MCP do Obsidian e o agente lista/lê/cria notas.
- [ ] `docs/brain/` versionado; nenhum segredo no `git diff`.
- [ ] `npm run brain:build && npm run brain:sync` idempotentes.
- [ ] `npm run brain:build && git diff --exit-code` limpo no CI.
- [ ] `brain-rules check` valida schema, IDs únicos e links de todas as `BR-*`.
- [ ] Cada `BR-*` ativa possui `implementacao`; as testáveis possuem `testes`.
- [ ] PRDs migrados para frontmatter; `sync-prds` e `index.md` consistentes.
- [ ] `npm run docs:check` e `npm run docs:fidelity` passam sobre a saída gerada.
- [ ] Skills/`AGENTS.md` refletem o novo princípio ("vault canônico; código é a
      fonte dos fatos técnicos").

## 11. Questões em aberto

- Versão alvo definitiva (0.17.0) e se a parte de geração de README/23 idiomas
  entra nesta entrega ou numa fase seguinte.
- Destino de `docs/analise.md`, `docs/analise-comparativa.md`,
  `docs/rebranding-rascunho.md` e de `docs/linkedin/` (local) no novo fluxo.
- Formato do fluxo de contribuição do vault versionado (PR + `CODEOWNERS`).
- Escopo inicial da extração de regras (quais domínios primeiro).
- Deduplicação das camadas `GLOSS-*`/`ERR-*` com a wiki existente.
