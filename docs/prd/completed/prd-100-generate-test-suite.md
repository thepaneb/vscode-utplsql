<!-- GENERATED FROM docs/brain/20-PRDs/prd-100-generate-test-suite.md — DO NOT EDIT -->

# PRD-100 — Geração de suíte a partir do package (scaffold avançado)

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.16.0 |
| Arquivos afetados | `src/scaffold.ts` (novo, puro), `src/commands/scaffold.ts` (novo), `src/commands/deps.ts`, `src/plsqlDeclarations.ts` (reuso), `src/config.ts`, `package.json` (comando + 4 settings + nls), `package.nls.json` + 23 `package.nls.*.json`, `src/i18nLocales.ts`, 24 notas `docs/brain/60-README/`, `docs/brain/70-Wiki/Commands.md`, `docs/brain/70-Wiki/Configuration.md` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |
| Relaciona-se a | PRD-59 (base), PRD-30 (organização), PRD-42 (`suiteParser`) |

## 1. Resumo

Evolui o **scaffold de suíte** da PRD-59 (esqueleto com um `%test`) para gerar um
pacote de teste completo: **um `%test` por procedure/function** do package de
produção, com prefixos/sufixos e as demais opções configuráveis, a partir de um
arquivo `.pks`/`.pkb` local **ou** de um objeto do banco. Reduz de minutos para
segundos o atrito de iniciar uma suíte.

## 2. Contexto e problema

- Hoje **não há geração de testes**: o usuário copia o boilerplate de
  `%suite`/`%test` à mão (confirmado: nada de `generate`/`scaffold` em `src/`).
- A PRD-59 cobre apenas o **esqueleto** (`%suite` + um `%test`); explicita
  "um `%test` por procedure/function" como follow-up.
- Já temos `parsePlsqlDeclarations()` (`src/plsqlDeclarations.ts`, puro) e
  `parseCodeLensItems`/`suiteParser`, reutilizáveis para extrair as rotinas.
- Referência de porte: `paddi35/utplsql-for-vscode`
  (`src/generate/testTemplate.ts`, settings `utplsql.generate.*`) — como a
  PRD-79 fez com a `coverageScope.ts` do mesmo projeto.

## 3. Objetivos / Não-objetivos

**Objetivos**
- O comando e a Code Action (compartilhados com a PRD-59, numa entrega única) que
  geram um spec `ut_<pkg>.pks` com `%suite` e **um `%test` por rotina**.
- Suportar as **4 settings de núcleo** de geração (`utplsql.generate.*`) — ver RF4.
- Aceitar como fonte o arquivo local **ou** o objeto compilado no banco.

**Não-objetivos**
- **Não** executar/compilar o pacote gerado nem escrever no banco.
- **Não** inferir asserções a partir do corpo (só nome de rotina + placeholder).
- **Não** substituir a PRD-59: o esqueleto simples continua funcionando.
- **Não** gerar o **corpo** `.pkb` da suíte (decidido em 2026-10-14: só a spec
  `.pks`; `NULL;`/asserções ficam com o usuário).
- **Não** expor as settings adiadas de 2026-10-14 (ver RF4): `testUnitPrefix`,
  `testUnitSuffix`, `disableTests`, `suitePath`, `indentSpaces` — ficam com
  default fixo e podem virar PRD futura.

## 4. Requisitos

### RF1 — Comando + Code Action

- Comando `utplsql.generateTestSuite` ("utPLSQL: Gerar suíte de teste…"),
  disponível no menu de contexto do **Test Explorer** e como **Code Action** em
  `**/*.pks`/`**/*.pkb` de produção (nunca em specs `ut_*` já existentes).

### RF2 — Fonte: arquivo ou banco

- Arquivo local: extrair rotinas com `parsePlsqlDeclarations()`.
- Objeto do banco: quando não há arquivo local, resolver via descoberta
  (`getObjectSource`/`DBA_SOURCE`) para obter a spec.

### RF3 — Um `%test` por rotina

- Para cada procedure/function (respeitando overloads), gerar:
  ```sql
  --%test(<nome> ...)
  PROCEDURE <nome>; -- TODO
  ```
- `%beforetest`/`%aftertest` **não** são emitidos por padrão (só o `%suite` + os
  `%test`); `%suitepath` e `%disabled` ficam de fora nesta versão (ver RF4).
- O resultado deve reabrir como spec válido no `suiteParser`.

### RF4 — Opções de geração (`utplsql.generate.*`): núcleo de 4

| Setting | Default | Efeito |
|---|---|---|
| `utplsql.generate.testPackagePrefix` | `ut_` | prefixo do nome da suíte/arquivo |
| `utplsql.generate.testPackageSuffix` | `""` | sufixo do nome da suíte/arquivo |
| `utplsql.generate.numberOfTestsPerUnit` | `1` | `%test` gerados por rotina |
| `utplsql.generate.generateComments` | `true` | emite `-- TODO` em cada teste |

**Adiadas (decidido em 2026-10-14)** — não entram como setting; default fixo:

| Prevista | Default fixo agora | Por quê |
|---|---|---|
| `testUnitPrefix` / `testUnitSuffix` | nome do `%test` = nome da rotina | cosmético |
| `disableTests` | testes habilitados | cosmético |
| `suitePath` | sem `--%suitepath` | depende da organização da suíte |
| `indentSpaces` | 2 espaços (padrão do repo) | cosmético |

Cada setting exposta custa **uma linha traduzida em 24 arquivos** de README
(cobrado pelo `docs-fidelity`); por isso o núcleo é deliberadamente pequeno — ver
RF6.

### RF5 — Escrita segura

- Nunca sobrescrever arquivo existente sem confirmação; respeitar
  `sourcePath`/include patterns para o destino.

### RF6 — Documentação e i18n (gate de CI)

- **4 settings** → cada chave precisa constar no `README.md` **e nas 23
  variantes** (o `docs-fidelity` falha o CI caso contrário) + a tabela de
  Configuration da wiki;
- comando + Code Action → mesma obrigação do RF4 da
  [[prd-59-scaffold-suite|PRD-59]] (nls ×24, `i18nLocales.ts`, `Commands.md`);
- validação local na PR: `npm run docs:check` (§7).

**Não-funcionais**
- RNF1 — `scaffold.ts` **puro** (sem `vscode`), testável com `node --test`.
- RNF2 — Sem novas dependências.
- RNF3 — Sem vazar caminhos absolutos em mensagens (SEC-002, logs).

## 5. Solução proposta

- `src/scaffold.ts` (novo): funções puras `buildSuiteTemplate(packageName, routines, options)` e
  `deriveRoutines(source, language)`; reusa `parsePlsqlDeclarations`.
- `src/commands/scaffold.ts` (novo): registra o comando e a Code Action a partir
  de `CommandDeps`; coleta opções via `readConfig()`.
- `src/config.ts` + `package.json`: as **4** settings de núcleo `utplsql.generate.*`.
- Fallback de banco reaproveita `discovery.ts`/`oracleRunner.ts` (sem SQL novo).

## 6. Configuração

- Comando `utplsql.generateTestSuite` (único, compartilhado com a PRD-59).
- Code Action em `**/*.pks`/`**/*.pkb`.
- Settings: `utplsql.generate.testPackagePrefix`,
  `utplsql.generate.testPackageSuffix`, `utplsql.generate.numberOfTestsPerUnit`,
  `utplsql.generate.generateComments`.

## 7. Plano de testes

- **Unitários**: `src/test/unit/scaffold.test.ts` — template com N rotinas,
  prefixo/sufixo do pacote, `numberOfTestsPerUnit`, `generateComments`; nome sem
  `ut_` vira `ut_<nome>`; saída parseável por `suiteParser`; **sem rotinas →
  esqueleto** (fallback da PRD-59).
- **Integração**: gerar a partir de um objeto do banco (fixture) e validar o
  conteúdo; Code Action disponível só em produção.
- **Manual**: gerar para um `.pkb` → arquivo criado; gerar de novo → confirmação.
- **CI**: `npm run docs:check` (as 4 settings nas 24 notas de README + comando na
  wiki/README) e `npm run brain:ci`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Sobrescrever spec existente | Confirmação explícita antes de gravar |
| Overloads/rotinas privadas | Só rotais da spec pública; seguir `parsePlsqlDeclarations` |
| Pacote muito grande gera arquivo enorme | `numberOfTestsPerUnit` + opção de omitir comentários |
| Divergência da PRD-59 | Entrega única (`feat/prd-59-100-scaffold`) e **um** comando; a PRD-59 documenta a fase esqueleto |
| Custo de tradução das settings (24 notas de README × N) | Núcleo de **4** settings (RF4); as demais viram default fixo/follow-up |
| Code Action aparecer em spec existente | Filtro `ut_*`/spec + teste de integração |

## 9. Rollout

- **0.16.0** (produtividade), junto da PRD-59.
- Registrar no `CHANGELOG.md`; publicação via GitHub release (`publish.yml`).

## 10. Critérios de aceite

- Gerar de um package com 5 rotinas produz 5 `%test` válidos; sem rotinas
  parseáveis, cai no esqueleto da PRD-59.
- As 4 settings de núcleo alteram a saída de forma previsível.
- Não sobrescreve sem confirmação; `npm test` e `lint` verdes.
- Coverage ≥ thresholds do `.c8rc`.
- `npm run docs:check` verde (4 settings nas 24 notas de README; comando na wiki e
  no README).

## 11. Questões em aberto

- Gerar também o **corpo** `.pkb` com `NULL;` em cada teste? — **Fechado em
  2026-10-14: não** (só a spec `.pks`).
- Usar `%beforetest`/`%aftertest` por padrão ou só sob demanda? — **Fechado:
  não** por padrão nesta versão.
- Nome do comando: `generateTestSuite` × `scaffoldSuite` (PRD-59)? — **Fechado:
  um único `utplsql.generateTestSuite`** (PRD-59 + PRD-100).

## 12. Impacto no cérebro

Regra **compartilhada** com a PRD-59 (entrega única): **`BR-UI-015`** — “gerar
suíte de teste não sobrescreve spec existente e produz template parseável pelo
`suiteParser`” — criada em 2026-10-14 com `prds: ["PRD-59", "PRD-100"]`,
`implementacao:` (`src/scaffold.ts`, `src/commands/scaffold.ts`) e `testes:`
(`src/test/unit/scaffold.test.ts`). O `regras:` deste frontmatter é derivado pelo
`brain:sync`.

RNFs sem regra: RNF2, RNF3 — “sem novas dependências” é convenção do repo
(nenhum pacote novo entrou) e “não vazar caminho absoluto” é atendido com
`workspace.asRelativePath` na mensagem (intenção da SEC-002, sem regra própria).
RNF1 (módulo puro) está em `requisitos` da BR-UI-015.

## 13. Implementado (2026-10-14)

Entregue com a [[prd-59-scaffold-suite|PRD-59]] na branch
`feat/prd-59-100-scaffold` (regra BR-UI-015):

- **RF4 = núcleo de 4 settings** (tabela do RF4). As demais ficam com default fixo
  (`testUnitPrefix`/`Suffix`, `disableTests`, `suitePath`, `indentSpaces`).
- **RF2 nos dois modos**: arquivo ativo, ou objeto do banco quando não há editor
  (`SCHEMA.OBJETO` → URI `utplsql-source:` → `ALL_SOURCE`, reusando a PRD-80, sem
  SQL novo).
- **Sem corpo `.pkb`**, **sem `%beforetest`/`%aftertest`** e **um único comando**
  (§11).
- Com `numberOfTestsPerUnit > 1`, do 2º teste em diante o nome recebe sufixo
  numérico — sem isso o pacote gerado declararia a mesma `PROCEDURE` duas vezes.
