<!-- GENERATED FROM docs/brain/20-PRDs/prd-99-brain-reuse.md — DO NOT EDIT -->

# PRD-99 — Cérebro reutilizável: guia de uso e reuso do knowledge base

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber |
| Data | 2026-10-09 |
| Componente | Documentação pública (vault + README + wiki/site) |
| Versão alvo | 0.16.0 |
| Arquivos afetados | `docs/brain/README.md`, `docs/brain/60-README/README (extensão).md` (+ 23 variantes), `docs/brain/70-Wiki/Contributing.md` (ou nova página), `LICENSE`/`NOTICE`, `scripts/brain*.cjs` (documentação), `site/**` (fase 2) |
| Esforço estimado | 1–2 dias |
| Complexidade | Baixa-Média |

## 1. Resumo

O **second brain** (`docs/brain/`) é público (versionado no repo) e rico — mas está
documentado **para os contribuidores do próprio projeto** (abrir no Obsidian, MCP,
grafo). Falta orientar **quem quer usar o conteúdo**: o que é, como navegar, o que
é reutilizável (schema das camadas, rastreabilidade, templates, pipeline) e a
**licença/atribuição**. Esta PRD cria esse guia e torna o cérebro **descobrível** e
**reutilizável** por terceiros.

## 2. Contexto e problema

- `docs/brain/` tem **611 arquivos** versionados, com camadas de conhecimento
  (`BR-*`, `SEC-*`, `NFR-*`, `PAT-*`, `TPL-*`, `GLOSS-*`, `ERR-*`, `ADR-*`), PRDs,
  MOCs com Dataview e rastreabilidade código/teste (`implementacao:`/`testes:`).
- O `docs/brain/README.md` é um ótimo guia **interno**, mas:
  - não explica a um **terceiro** o valor nem como aproveitar;
  - não diz o que é **reutilizável** (e o que é específico deste projeto);
  - não trata **licença/atribuição** (o repo é MIT, mas os docs não são citados);
  - o **README principal não menciona o cérebro** — quem chega pelo repo/Marketplace
    não sabe que existe um knowledge base.
- O pipeline (`brain:sync`/`brain:build`/`check`/`rules`/`gaps`) e os templates
  (`_templates/`) são **reutilizáveis** por outros projetos, mas isso não está
  documentado.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Dar um **guia de uso** (navegar/entender) e um **guia de reuso** (copiar/adaptar)
  do cérebro, voltados a **terceiros**.
- Tornar o cérebro **descobrível** (README principal e/ou wiki/site).
- Deixar explícita a **licença** (MIT) e um pedido **opcional** de atribuição.
- Documentar o **kit reutilizável**: estrutura de pastas, templates, scripts do
  pipeline e as convenções de frontmatter/IDs.

**Não-objetivos**
- Mudar o **schema** interno das camadas ou os IDs.
- Traduzir o guia para os 24 idiomas (no máximo EN; variantes depois).
- Transformar o cérebro num **repositório separado**.
- Extrair automaticamente o conhecimento para outros formatos (site/Docsify etc.).

## 4. Requisitos

### RF1 — Guia de reuso no `docs/brain/README.md`

Nova seção **"Reutilizar este cérebro (para outros projetos)"**, com:
- **o que é** (knowledge base versionado, fonte da verdade do texto humano) e
  **como navegar** (comece por `Home`; MOCs por camada; IDs como `BR-*`/`NFR-*`);
- **o que copiar** (estrutura de pastas, `_templates/`, os scripts
  `scripts/brain*.cjs`, as convenções de frontmatter e o pipeline);
- **o que adaptar** (nomes de camadas, MOCs, `brain:gaps`/`brain:rules` conforme o
  domínio);
- **licença e atribuição** (ver RF3).

### RF2 — Descoberta (README principal e wiki/site)

- Mencionar o cérebro na nota do vault `60-README/README (extensão).md` (logo do
  README), com link para `docs/brain/README.md` — e regenerar as **23 variantes**.
- Publicar o guia no **wiki** (página `70-Wiki/Knowledge-base.md`, via `publicar:`,
  com link cruzado em `Contributing.md`) e, na fase 2, no **site** (PRD-97).

### RF3 — Licença e atribuição

- Declarar explicitamente que **os documentos do cérebro são MIT** (como o repo),
  citando o `LICENSE`; adicionar um **`NOTICE`** (ou seção no README) com o pedido
  **opcional** de atribuição ("se reutilizar, cite o projeto e linke de volta").
- Deixar claro o que **não** é licenciado junto (marcas `utPLSQL`/`Oracle`,
  screenshots de terceiros, etc.).

### RF4 — Kit reutilizável (documentação + amostra)

- Documentar o **pipeline** (`brain:sync`/`build`/`check`/`rules`/`gaps`) e o que
  ele exige (Node, estrutura de pastas, blocos `brain:auto:*`).
- Apontar os **templates** (`_templates/template-*`) e as **MOCs** como ponto de
  partida; opcionalmente, um guia curto "**comece um cérebro no seu projeto**"
  (checklist passo a passo).

### RF5 — Publicação e rastreio

- A página de reuso entra no `brain:build` (`publicar:`) e é coberta por
  `docs:check`/`brain:gaps`.
- Opcional: post de feature no LinkedIn (`docs/linkedin/features/37-…`) sobre o
  cérebro reutilizável.

**Não-funcionais**
- RNF1 — Sem novas dependências; edição de notas do vault + `brain:build`.
- RNF2 — Manter o vault como fonte canônica e o CI de drift
  (`brain:ci` + `git diff --exit-code`).
- RNF3 — O guia deve ser útil **sem** exigir Obsidian (markdown puro navegável no
  GitHub), com o Obsidian como "bônus".

## 5. Solução proposta

- Editar a **nota** `docs/brain/README.md` (seção de reuso + licença/atribuição) e a
  nota do README principal (menção + link).
- Criar a página publicável `70-Wiki/Knowledge-base.md` (guia de uso/reuso, com
  `publicar: docs/wiki/Knowledge-base.md`) e linká-la em `Contributing.md`.
- Adicionar `NOTICE` (ou seção equivalente) para licença/atribuição.
- (Fase 2) publicar a página no **site** (junto da PRD-97).

## 6. Configuração

Nenhuma setting/comando da extensão. Eventual script de doc (nenhum obrigatório).

## 7. Plano de testes

- **Unitários**: `docsFidelity`/`brainBuild` (a nova página publicada entra nos
  checks); `brain:gaps` cobre os arquivos novos.
- **Integração**: não aplicável.
- **Validação manual**: abrir `docs/brain/README.md` e `docs/wiki/Knowledge-base.md`
  renderizados no GitHub e conferir links; rodar `brain:ci`/`docs:check`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Guia virar texto longo e desatualizar | Foco em "o que é/para que serve/como reusar"; o detalhe operacional fica nos MOCs/notas |
| Ambiguidade de licença (docs vs código) | Declarar MIT explicitamente + `NOTICE`; listar exceções (marcas/screenshots) |
| Duplicar o guia interno do `README.md` | Separar: "uso interno" (Obsidian/MCP) × "reuso por terceiros" |
| Tradução das 23 variantes | Limitar a EN neste escopo; variantes depois, se houver demanda |

## 9. Rollout

- **0.16.0** (versão de runtime + docs; junto de PRD-95/97/98).
- Registrar no `CHANGELOG.md`; opcional post de feature no LinkedIn.
- Publicação via **GitHub release** (`publish.yml`), como sempre.

## 10. Critérios de aceite

- `docs/brain/README.md` tem a seção de **reuso** (o que copiar/adaptar) e a de
  **licença/atribuição**.
- O **README principal** menciona o cérebro com link; as **23 variantes** também
  (via `brain:build`).
- Existe uma página **publicada** no wiki (e, na fase 2, no site) explicando uso e
  reuso.
- `NOTICE`/seção de licença deixa claro o MIT e as exceções.
- `brain:ci`/`docs:check`/`brain:gaps` verdes; sem drift.

## 11. Questões em aberto

- Licença dos **docs**: manter MIT (simples) ou adotar **CC BY 4.0** para o texto e
  MIT para o código? (preferência: MIT, para simplicidade).
- Nível de detalhe do "kit" (só documentar × incluir um exemplo/`_templates`
  mínimo copiável).
- Publicar o guia no **site** já na 0.16.0 ou só na fase 2 (PRD-97).
- Mencionar o cérebro **também** na página do Marketplace? (README já resolve.)

## 12. Impacto no cérebro

Nenhuma regra nesta proposta (PRD `proposed`). Na **conclusão**, criar a regra que a
materializa — provavelmente `BR-DOC-*` ("o knowledge base é público, licenciado e
documentado para reuso por terceiros") — com `prds: ["PRD-99"]`, `implementacao:` e
`testes:`, e confirmar o vínculo bidirecional com `npm run brain:rules`.
