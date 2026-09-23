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
| `30-Decisoes` | ADRs |
| `40-Bugs` | diário de diagnóstico |
| `50-Snippets` | comandos e queries |
| `60-README` | origem do README + variantes |
| `70-Wiki` | páginas publicáveis (GitHub wiki) |
| `90-Daily` | notas diárias |
| `99-Anexos` | imagens e anexos |
| `_templates` | templates |

