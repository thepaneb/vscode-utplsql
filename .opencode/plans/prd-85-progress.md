# PRD-85 — ponto de retomada (second brain + MCP)

> Handoff para continuar após reiniciar o opencode. Sessão original:
> `ses_f33a541ebffeglarVRk1ePC8LT`.
> Retomar: `opencode --continue` (ou `opencode --session ses_f33a541ebffeglarVRk1ePC8LT`).

## Objetivo

Tornar `docs/brain/` (vault Obsidian) a fonte da verdade versionada do projeto,
com artefatos do repo **gerados** a partir dele, e usar o Obsidian via **MCP**.
PRD: `docs/prd/in-progress/prd-85-brain-source-of-truth.md` (issue **#115**).
ADR: `docs/brain/30-Decisoes/ADR-002 - Vault como fonte da verdade.md`.

## Estado atual (commits)

| Commit | Conteúdo |
|---|---|
| `b2be3ff` | vault versionado + `opencode.json` (MCP) + PRD-85/ADR-002 |
| `02aead6` | 59 regras `BR-*` + `brain-rules` + stack/deps no `brain:sync` |
| `916a1e8` | `docs/functional` migrado para o vault + `brain:build` |
| `1274c7b` | camadas `SEC-*` (10) e `ERR-*` (11) |
| `82b60a4` | camadas `PAT-*` (7), `TPL-*` (7), `GLOSS-*` (10), `NFR-*` (8), `ENT-*` (6) |
| `929ad9a` | PRD-85 movida para `in-progress/` (label `prd:in-progress`) |
| `c4c2cdb` | MCP do Obsidian via bridge Python (stdio<->HTTP) |

### Sessão 2 (não commitada ainda) — itens 2, 3 e 4

- **Wiki** → `70-Wiki/` (27 páginas + `images/`), `publicar: docs/wiki/<pág>.md`.
  Links GitHub-wiki convertidos p/ wikilinks; `brain:build` converte de volta e
  espelha imagens. `Home` virou `Home (wiki)` (colisão com o `Home` do vault).
- **README + 23 variantes** → `60-README/`, `publicar: <README>`; links de idioma
  viram wikilinks e o build reconverte p/ `README.<locale>.md`. Logo
  `images/icon.png` copiado p/ `60-README/images/` e espelhado de volta (sem
  apagar outros arquivos de `images/`). `README` virou `README (extensão)`.
- **PRDs** → `20-PRDs/` (85 notas + `index.md`). **Status no frontmatter**;
  `docs/prd/**` e `index.md` **gerados** por `brain:build` (pasta derivada do
  status, status reinjetado no corpo, `index.md` com Roadmap/Estrutura gerados
  por `brain:sync` via `prd-roadmap`/`prd-estrutura`). `sync-prds.cjs` lê o
  frontmatter. Template canônico: `_templates/template-prd.md`. Skill
  `prd-workflow` reescrita.

Vault: **309 notas**. Validações OK: `brain:check`, `brain:rules` (59),
`brain:sync` (0), `brain:build check` (0 drift; 148 publicados + 16 imagens),
`docs:check`, `test:unit` (731/733).

## Decisões tomadas

- Fonte canônica: **texto humano no vault**; fatos técnicos (settings/comandos/
  versão/deps) fluem **código → vault** (`brain:sync`). Regras são **código-first**.
- Vault **versionado** no repo; ignorados: `.env`, `workspace*.json`, `graph.json`,
  `plugins/*/main.js|styles.css`, `obsidian-local-rest-api/data.json`, `.trash/`,
  `90-Daily/`.
- MCP do Obsidian via plugin **Local REST API** (servidor embutido, HTTP 27123).
  Sem mirrored: **portproxy** no Windows + firewall para a sub-rede do WSL.
  `opencode.json` usa MCP **local** com `scripts/obsidian-mcp.py` (bridge
  stdio<->HTTP nativo do WSL) que resolve host+API key em tempo de start — não
  depende de env do shell. `mcp-remote` foi descartado (descartava o `initialize`
  enviado imediatamente). Confirmado: `opencode mcp list` → `✓ obsidian connected`.

## Comandos

```sh
npm run brain:sync      # código -> vault (stack, deps, índices)
npm run brain:build     # vault -> repo (docs/functional/*, wiki, README, PRDs) ; "check" = drift
npm run brain:check     # wikilinks/links do vault
npm run brain:rules     # schema das BR-* + referências de todas as notas
npm run brain:ci        # sync + build + check + rules (drift no CI)
npm run docs:check      # consistência versionada (CI)
npm run test:unit       # compile + lint + node --test
```

## Pendências (retomar)

1. ~~Iniciar sessão nova do opencode p/ carregar as tools do MCP `obsidian`.~~
   ✅ Feito — `opencode mcp list` → `✓ obsidian connected`.
2. ~~Wiki (24 páginas) — estratégia A/B/C para 28 refs `images/` e 1 link
   relativo.~~ ✅ Feito — estratégia **A** (imagens no vault; build espelha).
3. ~~README + 23 variantes — mesma decisão.~~ ✅ Feito — estratégia **A**.
4. ~~PRDs canônicos no vault — status no frontmatter; reescrever `sync-prds.cjs`;
   `index.md`/Estrutura gerados.~~ ✅ Feito.
5. ~~Fase 5/6 — CI de drift: `brain:sync && brain:build && git diff --exit-code`;
   adaptar `docs:check`/`docs:fidelity` e `wiki.yml`.~~ ✅ Feito — novo script
   `brain:ci` (sync+build+check+rules); `ci.yml` roda `brain:ci` + `git diff
   --exit-code` (com `fetch-depth: 0` p/ datas estáveis) + `docs:check`;
   `docs-check.cjs` valida o frontmatter das notas PRD; `wiki.yml` reconstrói a
   wiki do vault antes de publicar (paths `docs/brain/70-Wiki/**`).
6. ~~Docs/instruções: reescrever `AGENTS.md` (local), skill `docs-fidelity`
   (direção invertida), `docs/brain/README.md`, `CONTRIBUTING.md`; ajustar
   `brain.cjs`.~~ ✅ Feito — `docs/brain/README.md`, `CONTRIBUTING.md`, skill
   `docs-fidelity` e `AGENTS.md` invertidos p/ vault-canônico; `brain.cjs`:
   `readme-variants`/`wiki-index`/`funcional-index` leem o vault; migrado o
   `docs/functional/README.md` (faltava) p/ `10-Projeto/Funcional/README.md`.
7. ~~Camadas `PIPE-*` (workflows) e `LOC-*` (i18n/23 idiomas) — geradas.~~ ✅ Feito —
   `brain:sync` agora gera **notas** (frontmatter `gerado: true`): `PIPE-*` em
   `11-Stack/` (3 workflows, com gatilhos/jobs/passos) e `LOC-*` em `12-I18n/`
   (24 locales de `package.nls.*.json`); notas geradas obsoletas são removidas;
   `MOC - I18n` + Dataview em `MOC - Stack`; Home e `docs/brain/README.md` atualizados.
   (Sem data dinâmica para não causar drift diário.)
8. ~~ADRs retrospectivos a partir dos 66 PRDs concluídos.~~ ✅ Feito — ADR-003 a
   ADR-012 (10 ADRs): descoberta DB-first, esbuild/VSIX, funções canônicas,
   módulos puros vs vscode, i18n, cobertura, Test Explorer, perfis de conexão,
   thick mode e debugger.
9. **Validador**: `--check-lines`; schema de `SEC/ERR/PAT/...` (hoje só refs);
   testes do `brain-build`.
10. **Governança**: fluxo de PR + `CODEOWNERS` do vault; destino de
    `docs/analise*.md`, `docs/rebranding-rascunho.md`, `docs/linkedin/`.
11. **Operacional WSL**: se o Windows reiniciar e a sub-rede mudar, refazer a regra
    de firewall do portproxy (`remoteip=172.21.16.0/20`).
12. `CHANGELOG.md` quando a PRD-85 concluir.

## Convenções adotadas (importante)

- **Nota do vault = fonte**; `docs/wiki/**`, `README*.md`, `docs/prd/**`,
  `docs/functional/**` são **gerados** (`brain:build`) com banner
  `<!-- GENERATED FROM ... DO NOT EDIT -->`.
- **Wikilinks** (`[[alvo|texto]]`) dentro do vault. O build converte:
  - wiki → `[texto](alvo)` (GitHub wiki, sem extensão);
  - README → `[texto](alvo.md)`;
  - índice de PRDs → links relativos `docs/prd/...` (gerador emite
    `../../../docs/prd/...`; build remove o prefixo).
- **Colisões de nome** com notas do vault: `Home` → `Home (wiki)`;
  `README` → `README (extensão)`.
- **PRD**: `status:` no frontmatter é a verdade; pasta gerada
  `docs/prd/<status>/`; status reinjetado no corpo (tabela ou `## Status`).
- Imagens: `70-Wiki/images` → `docs/wiki/images` (espelho destrutivo);
  `60-README/images` → `images/` (cópia não destrutiva).

## Estrutura do vault (novas pastas)

`11-Stack`, `13-Padroes`, `14-NFR`, `15-Regras`, `16-Seguranca`, `17-Componentes`,
`18-Erros`, `19-Glossario`, `10-Projeto/Funcional`, `10-Projeto/Dominio`.
