---
tipo: decisao
id: ADR-002
aliases: [ADR-002]
status: proposta
modulo: documentacao
data: 2026-09-23
tags: [adr, docs, brain, obsidian, mcp, conhecimento]
---

# ADR-002 - Vault como fonte da verdade (Obsidian + MCP)

## Contexto

Hoje o repo é a fonte da verdade e o vault (`docs/brain/`) é um índice local
gitignored, regenerado a partir do repo (`brain:sync`). O conhecimento do projeto
está fragmentado entre `docs/functional/`, `docs/wiki/`, `README*` (23 idiomas),
`AGENTS.md` e as PRDs, que driftam entre si. Além disso, não há unidades atômicas
de regra de negócio: comportamentos invariantes só existem como prosa no código.

Queríamos: (a) o vault como fonte da verdade de **todo texto humano**, com os
documentos do repo gerados a partir dele; (b) regras de negócio persistidas em
**unidades mínimas** rastreáveis a código/teste/PRD; (c) edição pelo agente via
**MCP** do Obsidian.

## Decisão

1. **Inverter o pipeline:** o vault passa a ser a superfície canônica e o repo é
   **gerado** (`brain:build`: vault → `README*`, `docs/wiki`, `docs/functional`,
   `docs/prd`). Fatos técnicos (settings, comandos, versão, dependências)
   continuam fluindo **código → vault** (`brain:sync`).
2. **Versionar `docs/brain/`** no repositório, ignorando apenas segredos e estado
   (`.obsidian/workspace*`, binários de plugin, `data.json` do Local REST API).
3. **Unidades mínimas de conhecimento:** regras de negócio atômicas (`BR-*`) mais
   camadas `NFR-*`, `ENT-*`, `GLOSS-*`, `ERR-*`, `SEC-*`, `PAT-*`, `DEP-*`,
   `TPL-*`, `LOC-*`, `PIPE-*`, todas com frontmatter validável e rastreabilidade.
4. **MCP do Obsidian** via o servidor embutido no plugin **Local REST API**
   (endpoint HTTP 27123), configurado no `opencode.json` com
   `{env:OBSIDIAN_API_KEY}` / `{env:OBSIDIAN_HOST}`.
5. **CI valida por arquivo** (fallback sem Obsidian): schema/IDs/links das regras e
   ausência de drift (`brain:build && git diff --exit-code`).

Detalhamento em [[prd-85-brain-source-of-truth|PRD-85]].

## Alternativas consideradas

- **Manter repo como fonte (status quo).** Menor risco, mas não resolve a
  fragmentação nem cria unidades de regra.
- **Vault híbrido (só conhecimento novo no vault; README/wiki no repo).** Mais
  simples e recomendado como escopo incremental, porém não cumpre "vault 100%
  canônico".
- **Vault em repositório separado** (submodule/próprio Git). Isola o conteúdo, mas
  complica CI, drift e a relação com `docs/prd`.
- **MCP por filesystem** em vez do app Obsidian. Funciona com o app fechado, mas
  perde metadados vivos (Dataview, backlinks, templates) e não usa o MCP nativo.
- **Servidor MCP terceiro** (ex.: `obsidian-mcp-server`). Desnecessário: o plugin
  Local REST API já embute um servidor MCP.

## Consequências

- **Positivas:** fonte única de conhecimento; regras atômicas e rastreáveis; base
  para métricas (regras sem teste, notas órfãs, traduções defasadas); agente
  edita o vault diretamente via MCP; fim da duplicação vault↔repo.
- **Negativas / trade-offs:** duas cópias no repo (vault canônico + repo gerado),
  exigindo banner + CI de drift; 23 traduções passam a ser geradas/gerenciadas;
  a verdade do status de PRD muda de pasta para frontmatter (reescrever
  `sync-prds`); dependência de rede WSL↔Windows para o MCP; risco de segredo
  versionado (`data.json`); `.obsidian/` precisa de poda.
- **Relacionadas:** o princípio "repo é fonte da verdade" em `AGENTS.md` e na skill
  `docs-fidelity` precisa ser reescrito na mesma entrega.

## Referências

- [[MOC - Documentacao]]
- [[MOC - Arquitetura]]
- [[MOC - PRDs]]
- [[prd-85-brain-source-of-truth|PRD-85]]
- `scripts/brain.cjs`, `scripts/docs-check.cjs`, `scripts/docs-fidelity.cjs`
- [docs/brain/README.md](../README.md)
