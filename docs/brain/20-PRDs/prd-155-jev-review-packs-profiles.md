---
tipo: prd
id: PRD-155
aliases: [PRD-155]
status: proposed
titulo: "Jev review: packs e profiles por domínio"
versao: "0.24.0"
versao_titulo: "0.24.0 - Segurança e distribuição"
data: "2026-11-27"
autor: "Gil Cleber Barboza"
verificado: "2026-11-27"
regras: []
docs: ["CHANGELOG"]
tags: [prd]
---

# PRD-155 - Jev review: packs e profiles por domínio

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-11-27 |
| Componente | Ferramental de desenvolvimento (Jev / `src/tools/jevReview.ts`) |
| Versão alvo | 0.24.0 (onda de segurança e distribuição) |
| Arquivos afetados | `src/tools/jevReview.ts`, `src/tools/jevPacks.ts` (novo), `src/test/unit/jevReview.test.ts`, `src/test/unit/jevPacks.test.ts` (novo), `scripts/jev-review.cjs`, `.opencode/skills/jev-review/SKILL.md`, `.github/workflows/jev-review.yml` (dispatch opcional), `CHANGELOG.md` |
| Esforço estimado | 2-3 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-153 (segurança de IA), PRD-154 (disclosure), PRD-98 (anti-drift), BR-PLAT-002, BR-PLAT-007 (a criar) |

## 1. Resumo

Evoluir o Jev de um questionário único para **packs independentes** (`core`,
`security`, `docs`, `release`) selecionáveis por **profiles** (`default`,
`security`, `docs`, `release`, `all`). Cada pack roda em um passe próprio, com
escopo de arquivos adequado ao seu domínio e agregação robusta própria; o
`core` continua sendo o default e não é diluído por perguntas extras. O
relatório passa a mostrar o resultado por pack, checklist acionável e custo
total, e o CI continua rodando apenas o `core`.

## 2. Contexto e problema

O Jev atual (`src/tools/jevReview.ts`) tem um único conjunto de cinco perguntas
(`security`, `correctness`, `tests`, `severity`, `recommendation`) calibrado
para o diff de código. Ele já cobre `src/**` por inteiro, agrega por p90 e só
bloqueia com evidência. O limite é de **domínio**: as perguntas não cobrem bem
os riscos específicos de Oracle/PLSQL, do vault de documentação e do processo de
release, e misturar tudo em um único passe aumenta o custo e dilui o sinal.

A implementação irmã em `isis-report-lib` (`scripts/jev_review.py`) validou uma
solução para esse limite: packs de perguntas, profiles alias, escopo por pack,
checklist local e fallback de modelo. Ela é específica de uma biblioteca Python
de relatórios e não deve ser portada inteira, mas o **modelo** de packs resolve
lacunas reais deste repositório:

- o Jev não pergunta sobre **binds/PLSQL**, contenção de path, segredos em
  logs, permissões de workflow e prompt injection com a mesma profundidade que
  o restante do projeto exige (PRD-153);
- mudanças de documentação e de release não têm perguntas sobre **vault →
  gerados**, paridade de README, PRDs, VSIX, atestação e matriz Oracle;
- um único passe precisa escolher entre incluir docs (caro e ruidoso) ou
  omiti-las (perde o risco documental);
- o relatório atual não tem checklist acionável nem custo por dimensão.

## 3. Objetivos / Não-objetivos

**Objetivos**

- Introduzir um registro declarativo de packs com perguntas, escopo de arquivos,
  dimensões e checklist.
- Rodar cada pack como **um passe independente** da API, com agregação robusta
  dentro do pack.
- Manter o `core` como default e preservar exatamente o comportamento atual
  quando nenhum pack for selecionado.
- Oferecer `--profile` e `--pack` (repetível), `--list-packs` e
  `--list-questions`.
- Aplicar escopo por pack: `core` mantém `src` primeiro e omite docs;
  `security` inclui código, workflows e config; `docs` inclui vault e docs
  raiz; `release` inclui manifesto, CHANGELOG, PRDs, site e workflows.
- Relatar veredito/dimensões/uso por pack, com custo total e checklist local.
- Manter o CI advisory no `core`; packs ficam para execução local ou
  `workflow_dispatch`, nunca required check.

**Não-objetivos**

- Portar o script Python do `isis-report-lib` ou criar um segundo CLI.
- Mudar a agregação robusta (máximos de segurança/correção, p90 de severidade,
  veredito derivado) ou a prioridade de `src/**` no `core`.
- Adicionar dependência de runtime/bundle; o Jev continua fora do bundle da
  extensão.
- Criar IA no runtime da extensão ou tornar o Jev um gate obrigatório.
- Implementar os controles de segurança da PRD-153 ou a política da PRD-154.
- Revisar arquivos gerados (`docs/prd/**`, `docs/wiki/**`, `README.*`) como
  fonte; o pack `docs` revê o vault e os docs raiz.

## 4. Requisitos

### RF1 - Registro de packs

Criar `src/tools/jevPacks.ts` (puro, sem `vscode`) com:

- `PackId = 'core' | 'security' | 'docs' | 'release'`;
- um registro `PACKS` com, para cada pack: `id`, `title`, `description`,
  `questions`, `dimensions` (id, título, limiar e leitura), `scopes` (predicados
  de caminho) e `checklist` (comandos locais);
- `core` reutiliza as cinco perguntas atuais e os limiares calibrados;
- `security`, `docs` e `release` têm perguntas próprias, sem alterar as do
  `core`;
- o registro é a única fonte para `--list-packs`, `--list-questions`, escopo e
  checklist.

### RF2 - Profiles e seleção

- `--profile <default|security|docs|release|all>`:
  - `default` = `core`;
  - `security` = `core` + `security`;
  - `docs` = `core` + `docs`;
  - `release` = `core` + `docs` + `release`;
  - `all` = `core` + `security` + `docs` + `release`.
- `--pack <id>` repetível seleciona packs explicitamente e **substitui** o
  profile; `--pack core` é permitido.
- Pack desconhecido ou combinação vazia sai com código 2 e mensagem clara.
- Sem `--profile`/`--pack`, o comportamento é idêntico ao atual (`core`).

### RF3 - Escopo por pack

`planDiffChunks` passa a receber um escopo (predicado) por pack, mantendo as
proteções atuais (sensíveis, binários, lockfiles, docs fora do `core`):

| Pack | Escopo |
|---|---|
| `core` | comportamento atual: `src/**` primeiro, docs omitidas, sensíveis/binários omitidos |
| `security` | `src/**`, `scripts/**`, `.github/**`, `package.json`, `package.nls*.json`, `opencode.json`, `.opencode/**`, `SECURITY.md` |
| `docs` | `docs/brain/**/*.md`, `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `AI_USAGE.md`, `.opencode/skills/**` |
| `release` | `package.json`, `package.nls*.json`, `CHANGELOG.md`, `.github/workflows/**`, `docs/brain/20-PRDs/**`, `site/**` |

- O relatório mostra, por pack, arquivos revisados, omitidos e blocos.
- Um pack sem arquivos no diff é pulado com aviso e **não** chama a API.
- Nenhum pack pode reintroduzir `.env*`, lockfiles, binários ou caminhos
  sensíveis; o filtro de segurança é aplicado antes do escopo.

### RF4 - Execução e agregação

- Os packs rodam sequencialmente, cada um com seus próprios blocos e perguntas.
- Dentro de cada pack, vale a agregação atual: segurança/correção máximas,
  severidade no p90 e recomendação derivada; `block` bruto sem evidência vira
  `comment`.
- O veredito geral é derivado de todos os packs:
  - `block` se qualquer pack tiver segurança/correção acima do limiar ou p90
    de severidade ≥ 3;
  - `comment` se houver achado de testes, severidade ≥ 2, ou achado em
    `docs`/`release` sem evidência de block;
  - `approve` caso contrário.
- O `core` continua aparecendo como resultado principal; os packs são seções
  adicionais, não substituem o core.
- Falha de um pack (API/rede) é visível, preserva o resultado dos packs já
  concluídos no relatório e sai com código 1; não há skip silencioso.

### RF5 - Relatório e checklist

- Markdown: seção do `core` (como hoje) + uma seção por pack com tabela de
  dimensões, veredito, achados e checklist.
- JSON: `profile`, `packs[]` (id, título, veredito, severidade, dimensões,
  achados, arquivos/blocos, modelos, uso) e totais de tokens/custo.
- Cada achado de pack sugere comandos locais, por exemplo:
  - `security`: revisão de binds, `npm run audit:prod`, `npm run test:unit`;
  - `docs`: `npm run brain:ci`, `npm run docs:check`,
    `npm run docs:features-check -- <versão>`;
  - `release`: `npm run version:check`, `npm test`, `npm run package`,
    `npm run db:matrix:list`;
  - `core`: `npm test`, `npm run lint`.
- O rodapé continua deixando claro que o relatório é probabilístico e não
  substitui testes, lint ou revisão humana.

### RF6 - Custo, dry-run e CI

- `--dry-run` lista profile, packs, escopo, blocos e número de chamadas
  previstas sem chamar a API.
- `--max-calls <n>` (default 240) aborta antes de exceder o orçamento de
  chamadas; a mensagem mostra o cálculo e sugere reduzir packs/escopo.
- O workflow `.github/workflows/jev-review.yml` continua em `--profile default`
  (core). Um input opcional de `workflow_dispatch` (`profile`) permite rodar
  packs manualmente; packs nunca são required check.
- O custo estimado deve constar do relatório e da skill: no release de
  referência (44 blocos, ~379 mil tokens), `all` faz ~4× chamadas e custa
  ~US$ 0,06 no `jev-1.14`; `default` permanece ~US$ 0,016.

### RF7 - Documentação operacional

- Atualizar `.opencode/skills/jev-review/SKILL.md` com packs, profiles,
  escopos, custo, checklist e exemplos.
- `--help` documenta `--profile`, `--pack`, `--list-packs`,
  `--list-questions` e `--max-calls`.
- A nota gerada `PIPE-jev-review` é atualizada via `brain:sync` se o workflow
  mudar.
- Nenhuma setting de usuário nova; tudo é ferramental de desenvolvimento.

**Não-funcionais**

- RNF1 - Nenhuma dependência nova; o Jev continua fora do bundle.
- RNF2 - Testes unitários sem rede; cobertura global nos thresholds do `.c8rc`.
- RNF3 - `default` mantém o custo e o comportamento atuais no CI.
- RNF4 - Falha de pack é visível e não contamina o resultado do `core`.
- RNF5 - `brain:ci`, `docs:check`, `brain:rules` e `version:check` verdes.

## 5. Solução proposta

1. Extrair o registro e os helpers puros para `src/tools/jevPacks.ts`:
   `PACKS`, `PROFILES`, `resolvePacks(profile, packs)`, `packScope(id)`,
   `packChecklist(id)` e `packDimensions(id)`.
2. Generalizar `planDiffChunks` para receber um `DiffScope` (predicado e modo
   `srcFirst`) e manter o plano atual como `CORE_SCOPE`.
3. Em `main`, resolver os packs, planejar cada um, rodar os passes e guardar
   `PackReview[]`; o `core` mantém `AggregateReview` para compatibilidade.
4. Reutilizar `aggregateChunkResponses` por pack e criar
   `aggregatePackReviews` para o veredito geral, sem alterar a regra de
   evidência.
5. Estender `formatMarkdown`/`formatJson` com as seções/objetos de pack e
   totais; manter o formato atual quando `packs = [core]`.
6. Adicionar `--profile`, `--pack`, `--list-packs`, `--list-questions` e
   `--max-calls` ao parser e ao USAGE.
7. Atualizar a skill e o workflow (dispatch opcional), sem tornar packs
   obrigatórios.

## 6. Configuração

Nenhuma setting de usuário. Novas flags de CLI:

```sh
npm run jev:review -- --base origin/main --profile security
npm run jev:review -- --base origin/main --pack core --pack docs
npm run jev:review -- --base origin/main --list-packs
npm run jev:review -- --base origin/main --list-questions
npm run jev:review -- --base origin/main --profile all --dry-run
```

## 7. Plano de testes

- **Unitários**: resolução de profiles/packs (incluindo desconhecido e vazio);
  escopo de cada pack (arquivos incluídos/omitidos); pack sem arquivos não
  chama fetch; agregação por pack e veredito geral; `--max-calls`; markdown/JSON
  com um e múltiplos packs; `--dry-run` com contagem de chamadas; fallback por
  pack; compatibilidade do `core` sozinho.
- **Integração**: rodar `--profile default` em um diff real e comparar com o
  relatório atual; rodar `--profile all --dry-run` e conferir escopos/custo;
  rodar `security` em um diff com SQL concatenado e `docs` em uma nota do vault.
- **Manual**: abrir um PR de teste e conferir que o comentário do CI continua
  só com o core; rodar `--profile release` localmente antes de uma release.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Custo multiplicar por pack | `default` = core; `--dry-run`, `--max-calls`, escopo estreito e packs só em dispatch/local |
| Packs diluírem o core | Cada pack é um passe separado; o core mantém perguntas e limiares; veredito geral deriva do conjunto |
| Escopo de docs incluir arquivos gerados e ruído | Pack revê o vault e docs raiz; gerados ficam fora |
| Falso positivo de docs/release virar block | Block exige segurança/correção acima do limiar ou p90 ≥ 3; o resto vira comment |
| Perguntas desatualizadas | Registro único + testes de contrato + checklist; revisão na release |
| Pack falhar e esconder o core | Falha visível, resultado parcial preservado, exit 1 |
| Prompt injection aumentar com mais contexto | Filtro/redação atuais, aviso de diff não confiável e saída validada (PRD-153) |

## 9. Rollout

- Release alvo: 0.24.0, depois de PRD-153/154.
- `default` inalterado no CI; packs entram como opt-in local/dispatch.
- Entrada no `CHANGELOG.md` na conclusão, citando PRD-155.
- Sem migração para usuários; nenhuma setting nova.

## 10. Critérios de aceite

- `--profile` e `--pack` funcionam; pack desconhecido sai 2.
- Sem flags, o relatório do `core` é equivalente ao atual.
- Cada pack tem escopo, perguntas e checklist próprios; pack vazio é pulado.
- Agregação por pack e veredito geral seguem a regra de evidência.
- Markdown/JSON mostram packs, modelos/fallback, uso e totais.
- `--dry-run` mostra chamadas previstas; `--max-calls` aborta antes do limite.
- CI continua só com o core; packs são opcionais.
- `npm test`, `npm run test:coverage`, `npm run lint`, `brain:ci`,
  `docs:check` e `version:check` verdes.

## 11. Questões em aberto

- O pack `docs` deve incluir `README.*` (26 variantes) ou apenas `README.md` e
  as notas do vault?
- O pack `release` deve rodar no `workflow_dispatch` ou apenas localmente?
- Os limiares dos packs devem ser recalibrados por modelo (`free` vs `1.14`)?
- O `--max-calls` default de 240 é adequado para PRs grandes ou deve ser
  proporcional ao número de blocos?
- Vale um pack `quality` (dead code, higiene de testes, tipagem) em uma PRD
  futura ou ele fica fora deste escopo?

## 12. Impacto no cérebro

Na conclusão, criar `BR-PLAT-007` — "Packs do Jev rodam em passes independentes
e não diluem o core" — com `prds: ["PRD-155"]`, `implementacao:` em
`src/tools/jevPacks.ts`/`src/tools/jevReview.ts` e `testes:` em
`src/test/unit/jevPacks.test.ts`/`src/test/unit/jevReview.test.ts`. Nenhuma
regra `SEC-*` nova: o pack `security` é advisory e não substitui os controles de
runtime da PRD-153.

## Impacto nas docs

- `CHANGELOG.md`: entrada na conclusão, citando PRD-155.
- `.opencode/skills/jev-review/SKILL.md`: documentação operacional dos packs,
  profiles, escopos, custo e checklist.
- `docs/brain/11-Stack/PIPE-jev-review - Jev Review.md`: regenerada por
  `brain:sync` se o workflow ganhar o input de dispatch.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-98-docs-anti-drift|PRD-98]] · [[prd-153-ai-security-prompt-injection-data-egress|PRD-153]] · [[prd-154-ai-disclosure-provenance|PRD-154]]
- ⚙️ Pipelines: [[PIPE-jev-review - Jev Review|PIPE-jev-review]]
- 🔗 Mesma versão (0.24.0 - Segurança e distribuição): [[prd-153-ai-security-prompt-injection-data-egress|PRD-153]] · [[prd-154-ai-disclosure-provenance|PRD-154]]
- 🚀 ⬅️ release anterior: [[prd-149-performance-engineering-quality|PRD-149 (0.23.0)]] · ➡️ próxima release: [[prd-132-ux-execution-dryrun-jump|PRD-132 (0.25.0)]]
<!-- brain:auto:end -->
