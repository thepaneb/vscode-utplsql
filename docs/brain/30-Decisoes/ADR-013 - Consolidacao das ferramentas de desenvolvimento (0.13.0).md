---
tipo: decisao
id: ADR-013
aliases: [ADR-013]
status: proposta
modulo: ferramentas
data: 2026-09-25
tags: [adr, ferramentas, db-matrix, mcp, obsidian, testes]
---

# ADR-013 - Consolidação das ferramentas de desenvolvimento (0.13.0)

## Contexto

Durante a 0.13.0 acumulamos trabalho de **ferramentas de desenvolvimento** que não
é feature da extensão e por isso não cabia nas PRDs de produto — mas também não
estava registrado em lugar nenhum. Esse trabalho caiu em três frentes:

1. **Matriz de bancos**: o `bootstrap.sh` reaproveitava o fonte do utPLSQL de
   qualquer versão em cache (`find "$CACHE_DIR" -name install_headless.sql`), o
   que instalava o 3.2.3 no Oracle 12.2 (incompatível, `PLS-00222`) e abortava a
   matriz. Além disso, o `run.sh` reexportava `UTPLSQL_VERSION` por banco e usava
   o valor mutado como default do seguinte, então a versão do 12.2 (`v3.1.14`)
   vazava para as demais.
2. **MCP do Obsidian**: o bridge Python (`scripts/obsidian-mcp.py`) resolvia o
   host pelo gateway do WSL, o que exigia `portproxy`/firewall e quebrava a cada
   mudança de sub-rede. O `opencode.json` usava a forma antiga (`mcp.obsidian`).
3. **Testes e grafo do vault**: o E2E de jump-to-failure revelou um bug real de
   parser (registrado na [[prd-87-suitepath-results-jump|PRD-87]]); ao mesmo tempo
   evoluímos as relações do grafo do vault em oito entregas incrementais.

## Decisão

1. **Cache do utPLSQL escopado por versão.** `ensure_utplsql_source()` usa um
   diretório canônico (`src-<versão>`) e candidatos que cobrem as duas convenções
   de nome do archive do GitHub (`utPLSQL-3.1.14` sem o `v`, `utPLSQL-v.3.2.3`
   com). O download extrai num stage e move o topo para o destino canônico.
2. **Default de versão estável na matriz.** `run.sh` captura
   `UTPLSQL_BASE_VERSION` antes do loop e o usa como default do parser; o
   `export UTPLSQL_VERSION` por banco continua (o bootstrap consome).
3. **MCP do Obsidian nativo no Windows.** O bridge resolve `OBSIDIAN_HOST` (ou
   `127.0.0.1` em `os.name == "nt"`), e o `opencode.json` usa a forma V2
   (`mcp.servers.obsidian`, launcher `py -3`). O gateway do WSL fica como último
   recurso.
4. **Relações do vault evoluídas** com o padrão
   `frontmatter → validação (brain-rules) → render + backlink (brain.cjs)`:
   `relacionado` tipado, `decisoes`, `erros`, par código↔teste, `origem` das
   publicadas, menções `PRD-NN` e integridade `SEC ↔ regras`.
5. **Índice de PRDs fora do grafo.** As tabelas do `index.md` deixaram o corpo
   da nota (criavam um segundo hub de PRDs no Obsidian via links relativos) e
   são geradas no build (`renderPrdIndex`).
6. **`_templates/` excluída do Obsidian** via `.obsidian/app.json` versionado.

## Alternativas consideradas

- **Criar PRDs retroativas para todo o tooling.** Rejeitado: PRD é documento de
  requisito de produto; "bridge MCP em Python" e "correção de default no
  `run.sh`" não são features da extensão. Geraria PRD artificial e poluiria o
  tracker (`sync-prds` cria issue por PRD). Só o bloco user-facing (parser JUnit)
  virou PRD — ver [[prd-87-suitepath-results-jump|PRD-87]].
- **Deixar o MCP em WSL/gateway.** Rejeitado: quebrava a cada reinício por
  mudança de sub-rede do WSL.
- **Só limpar o cache do utPLSQL no 12.2.** Rejeitado: o `find` global
  reaproveitaria o fonte errado de novo; a correção precisava escopar por versão.
- **Manter as tabelas do índice no vault.** Rejeitado: duplicava o hub de PRDs no
  grafo; o artefato publicado continua com as tabelas, geradas no build.

## Consequências

- **Positivas:** a matriz roda nas 5 versões (12.2 incluído) sem bootstrap
  cruzado; o MCP conecta sem depender de `portproxy`; o grafo do vault tem um hub
  por camada; o índice não compete com a MOC.
- **Negativas / trade-offs:** `renderPrdIndex` duplica parte da lógica do
  `genPrdRoadmap` (o gerador do vault e o do build evoluem em paralelo); o bridge
  Python segue sendo dependência local do Windows; o `app.json` do Obsidian passa
  a ser versionado (config de editor no repo).
- **Relacionadas:** [[ADR-002 - Vault como fonte da verdade]],
  [[prd-87-suitepath-results-jump|PRD-87]],
  [[prd-85-brain-source-of-truth|PRD-85]].

## Referências

- [[MOC - Documentacao]]
- [[MOC - Stack]]
- [[MOC - PRDs]]
- `scripts/db-matrix/bootstrap.sh`, `scripts/db-matrix/run.sh`,
  `scripts/obsidian-mcp.py`, `scripts/brain.cjs`, `scripts/brain-rules.cjs`,
  `scripts/brain-build.cjs`
