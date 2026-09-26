---
tipo: guia
status: ativo
verificado: 2026-09-23
tags: [brain, obsidian, guia]
---

# Second Brain — vscode-utplsql

Vault do Obsidian com o conhecimento do projeto. Este diretório é **versionado** no
repositório (`docs/brain/`) e é a **fonte da verdade** do texto escrito por humanos:
os artefatos do repo (`README*`, `docs/wiki/`, `docs/functional/`, `docs/prd/`) são
**gerados** a partir dele. Segredos, estado do app e binários de plugin ficam fora do
controle de versão — ver `.gitignore` e [[ADR-002 - Vault como fonte da verdade]].

## Abrir no Obsidian

1. Obsidian → **Open folder as vault** → selecione esta pasta (`docs/brain`).
   No Windows: `D:\Users\gilcl\Documents\GitHub\vscode-utplsql\docs\brain`.
2. Comece por [[Home]].

## MCP (Obsidian Local REST API)

O agente lê/escreve o vault via **MCP** (`opencode.json` +
`scripts/obsidian-mcp.py`), usando o servidor embutido no plugin **Local REST API**
(HTTP 27123). No WSL, o acesso ao Obsidian no Windows exige `portproxy` + regra de
firewall para a sub-rede do WSL — ver `AGENTS.md` (local).

## Graph view — grupos de cor

O `.obsidian/graph.json` é **local (gitignored)**. Para colorir o grafo por camada,
em **Graph view → ⚙️ → Groups → +** (ou copiando para `graph.json`):

| Query | Camada | Cor |
|---|---|---|
| `path:20-PRDs` | PRDs | amarelo |
| `path:15-Regras` | regras (`BR-*`) | azul |
| `path:14-NFR` | NFRs | verde |
| `path:16-Seguranca` | segurança (`SEC-*`) | vermelho |
| `path:18-Erros` | erros (`ERR-*`) | laranja |
| `path:13-Padroes` | padrões (`PAT-*`) | roxo |
| `path:17-Componentes` | componentes (`TPL-*`) | ciano |
| `path:19-Glossario` | glossário (`GLOSS-*`) | cinza |
| `path:30-Decisoes` | ADRs | rosa |
| `path:70-Wiki` | wiki | verde-água |
| `path:60-README` | README | lima |
| `path:12-I18n` | locales (`LOC-*`) | marrom |
| `path:11-Stack` | stack/pipelines (`PIPE-*`) | areia |
| `path:10-Projeto` | projeto/funcional/domínio | índigo |
| `path:21-Codigo` | código (`COD-*`) | azul-aço |
| `path:22-Testes` | testes (`TST-*`) | oliva |

> Os grupos também estão versionados em `.obsidian/graph.json` (local). Ajuste
> pelo painel **Graph view → ⚙️ → Groups** se preferir outras cores.

## Mapa de código — rastreabilidade

As camadas de conhecimento ligam-se ao **código** e aos **testes** por dois
campos de frontmatter (validados por `npm run brain:rules`):

- `implementacao:` — arquivos de `src/` que implementam a nota (com linha opcional,
  ex.: `src/oracleRunner.ts:684`);
- `testes:` — arquivos de teste que a validam.

Como o Obsidian não coloca arquivos fora do vault no grafo, o `brain:sync`
gera **notas-espelho**:

- `21-Codigo/COD - <arquivo>.md` (uma por arquivo de `src/` referenciado);
- `22-Testes/TST - <arquivo>.md` (uma por arquivo de teste referenciado).

Cada camada ganha em `## Conexões` as linhas **🧩 Código** e **🧪 Testes** com
wikilinks para essas notas; assim o grafo mostra *regra → módulo → teste*. A nota
do módulo tem um bloco Dataview "Onde aparece" listando quem a referencia.
**Não edite** `COD-*`/`TST-*` (são regeneradas).

## Configuração recomendada (Settings)

- **Files & Links → New link format:** `Relative path to file` (os links para `docs/`
  e `src/` fora do vault são markdown relativos).
- **Files & Links → Templates folder:** `_templates`.
- **Core plugins:** Backlinks, Graph view, Outgoing links, Daily notes
  (pasta `90-Daily`, template `_templates/template-daily`).

## Plugins da comunidade

- **Dataview** — os dashboards nos MOCs usam blocos `dataview`.
- **Templater** — opcional, alternativa ao core Templates.
- **Obsidian Git** — se quiser versionar o vault num repo separado.
- **Excalidraw** — diagramas (ex.: fluxo conn1/conn2).

## Templates — passo a passo (Obsidian em português)

Os templates são do **plugin principal "Modelos"** (sintaxe `{{date:...}}`), não do
Templater. Configure e use assim:

1. `Ctrl+,` → **Configurações**.
2. Menu lateral → **Plugins principais** → ative **Modelos** (já vem ativo por padrão).
3. Clique na **engrenagem** ao lado de **Modelos** → em **Local da pasta de modelos**
   coloque `_templates` (já configurado neste vault).
4. Para inserir: `Ctrl+P` (**Paleta de comandos**) → **"Modelos: Inserir modelo"** →
   escolha `template-adr`, `template-bug`, `template-snippet`, `template-nota` ou
   `template-daily`. Os campos `{{title}}` e `{{date:YYYY-MM-DD}}` são preenchidos
   automaticamente.
5. (Opcional) Atalho: **Configurações → Atalhos** → busque "Inserir modelo" → defina
   ex.: `Ctrl+Shift+T`.

### Notas diárias

1. `Ctrl+,` → **Plugins principais** → ative **Notas diárias**.
2. Engrenagem ao lado de **Notas diárias**:
   - **Local do novo arquivo** (novas notas diárias): `90-Daily`
   - **Local do arquivo de modelo**: `_templates/template-daily`
   - **Formato da data**: `YYYY-MM-DD`
3. Abrir a de hoje: `Ctrl+P` → **"Notas diárias: Abrir nota de hoje"** (ou o ícone de
   calendário na barra lateral).

> ⚠️ Se inserir por **Templater**, a sintaxe é diferente (`<% tp.date.now() %>`) e os
> `{{date}}` ficariam literais. Use o comando **Modelos: Inserir modelo** ou crie os
> templates do Templater à parte.

## Convenções

- Uma nota por assunto; MOCs só indexam e linkam.
- **O vault é a fonte da verdade** do texto humano. `docs/functional/`, `docs/wiki/`,
  `docs/prd/` e `README*.md` são **gerados** (`npm run brain:build`) — não os edite.
- Frontmatter sempre com `tipo` e `status` (os Dataview filtram por isso).
- Notas de camada têm `id` e `aliases: [<id>]` (ex.: `BR-CONN-005`, `NFR-006`),
  então dá para linkar/buscar pelo ID.
- As MOCs têm um bloco **Índice (links)** gerado (`moc-index`) que lista as notas
  da pasta como wikilinks — o hub do grafo.
- Ao **revisar** uma nota, atualize `verificado: YYYY-MM-DD` no frontmatter. O painel
  "🔁 Revisar" em [[Home]] lista o que passou de 120 dias.
- **Links:**
  - Nota **dentro** do vault → `[[Nome da nota]]` (dá backlinks/grafo).
  - Arquivo **fora** do vault (ex.: `src/`) → link markdown relativo. Obsidian
    **não** navega o grafo para fora do vault (é esperado).

## Pipeline (fonte → gerado)

```
docs/brain/ (fonte) ──brain:build──► README*, docs/wiki, docs/functional, docs/prd
        ▲                                              │
        └──────── brain:sync (fatos do código) ────────┘
```

- **`brain:sync`** injeta fatos do código (stack, deps, contagens) nos blocos
  `<!-- brain:auto:start:<nome> --> … <!-- brain:auto:end -->` e regenera o
  Roadmap/Estrutura dos PRDs a partir do frontmatter.
- **`brain:build`** publica as notas com `publicar:` (ou `tipo: prd`) nos
  artefatos do repo, com banner `<!-- GENERATED FROM ... DO NOT EDIT -->`.

### Comandos

```sh
npm run brain:sync            # fatos do código -> vault
npm run brain:build           # vault -> repo (wiki, README, functional, PRDs)
npm run brain:build -- check  # drift (não escreve)
npm run brain:check           # valida wikilinks/links do vault
npm run brain:rules           # valida as BR-*
npm run brain:ci              # sync + build + check + rules (usado no CI)
```

O CI roda `brain:ci` + `git diff --exit-code`: se o vault e os artefatos gerados
divergirem, o build falha.

## Governança

- `docs/brain/` é protegido por [`.github/CODEOWNERS`](../../.github/CODEOWNERS)
  (revisão do mantenedor).
- Fluxo de PR: edite a **nota do vault** → `npm run brain:sync && npm run
  brain:build` → `npm run brain:ci` (sem drift) → o commit inclui a nota **e** os
  artefatos gerados.
- PRs que mexam no vault ou nos gerados precisam de `brain:ci` +
  `git diff --exit-code` limpos (o CI já cobre).
- **Fora do vault** (locais, gitignored): `docs/analise.md`,
  `docs/analise-comparativa.md`, `docs/rebranding-rascunho.md` e `docs/linkedin/`.
  Não são versionados nem gerados.

## Estrutura

| Pasta | Uso |
|---|---|
| `00-Inbox` | captura rápida |
| `10-Projeto` | MOCs + `Funcional/` (spec funcional canônica) |
| `11-Stack` | stack + dependências + pipelines (`PIPE-*`) |
| `12-I18n` | locales da extensão (`LOC-*`, gerado) |
| `13-Padroes` | padrões (`PAT-*`) |
| `14-NFR` | requisitos não-funcionais (`NFR-*`) |
| `15-Regras` | regras de negócio (`BR-*`) |
| `16-Seguranca` | invariantes de segurança (`SEC-*`) |
| `17-Componentes` | componentes de terceiros (`TPL-*`) |
| `18-Erros` | catálogo de erros (`ERR-*`) |
| `19-Glossario` | linguagem ubíqua (`GLOSS-*`) |
| `20-PRDs` | PRDs canônicos (status no frontmatter) |
| `21-Codigo` | notas-espelho de `src/` (`COD-*`, gerado) |
| `22-Testes` | notas-espelho de `src/test/` (`TST-*`, gerado) |
| `30-Decisoes` | ADRs |
| `40-Bugs` | diário de diagnóstico |
| `50-Snippets` | comandos e queries |
| `60-README` | origem do README + variantes |
| `70-Wiki` | páginas publicáveis (GitHub wiki) |
| `90-Daily` | notas diárias |
| `99-Anexos` | imagens e anexos |
| `_templates` | templates |

