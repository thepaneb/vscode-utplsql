# Second Brain — vscode-utplsql

Vault do Obsidian com o conhecimento do projeto. Este diretório é **versionado**
no repositório (`docs/brain/`); segredos, estado do app e binários de plugin ficam
fora do controle de versão — ver `.gitignore` e
[[ADR-002 - Vault como fonte da verdade]].

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
- **Não copie** conteúdo de `docs/prd/`, `docs/wiki/` ou código — linke/transclua.
- Frontmatter sempre com `tipo` e `status` (os Dataview filtram por isso).
- Ao **revisar** uma nota, atualize `verificado: YYYY-MM-DD` no frontmatter. O painel
  "🔁 Revisar" em [[Home]] lista o que passou de 120 dias.
- **Links:**
  - Nota **dentro** do vault → `[[Nome da nota]]` (dá backlinks/grafo).
  - Arquivo **fora** do vault (ex.: `docs/`, `src/`, `README.md`) → link markdown
    relativo `[texto](../../docs/wiki/Architecture.md)`. Obsidian **não** navega o
    grafo para fora do vault (é esperado).

## Manter atualizado (anti-drift)

O repo é a **fonte da verdade**; o vault só indexa/sintetiza. Para garantir atualização:

1. **Nunca copie listas manuais.** Índices derivados do repo ficam entre marcadores e
   são regenerados (tool em `scripts/brain.cjs`):
   ```sh
   npm run brain:sync
   ```
   Blocos `<!-- brain:auto:start:<nome> --> … <!-- brain:auto:end -->`:
   - `MOC - Funcional` — espelha `docs/functional/README.md`
   - `MOC - PRDs` — contagens de `docs/prd/{proposed,approved,in-progress,completed}`
   - `MOC - Documentacao` — docs da raiz, **variantes de idioma do README** (alerta ⚠️
     de tradução defasada), páginas da wiki e material de LinkedIn
2. **Valide os links** (pega `docs/` renomeado/movido):
   ```sh
   npm run brain:check
   ```
3. **Prefira Dataview a texto estático** para tudo que muda (prazos, status, listas).
4. **Rode `sync` + `check`** depois de mover docs/PRDs e antes de um commit grande.
   O `npm run sync-prds` já chama `brain:sync` automaticamente ao final.
5. **Peça ao agente** ("atualize o brain") ao encerrar uma tarefa — ele regenera e
   valida.

> Dataview **não** indexa arquivos fora do vault (`docs/`, `src/`). Por isso esses
> índices são gerados por `sync`, não por consulta.

## Estrutura

| Pasta | Uso |
|---|---|
| `00-Inbox` | captura rápida |
| `10-Projeto` | MOCs de visão geral, arquitetura, Oracle, testes |
| `20-PRDs` | índice de PRDs (link para `docs/prd/`) |
| `30-Decisoes` | ADRs |
| `40-Bugs` | diário de diagnóstico |
| `50-Snippets` | comandos e queries |
| `90-Daily` | notas diárias |
| `99-Anexos` | imagens e anexos |
| `_templates` | templates |
| `_tools` | reservado (o tool canônico é `scripts/brain.cjs`) |
