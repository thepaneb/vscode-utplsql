---
tipo: prd
id: PRD-100
aliases: [PRD-100]
status: proposed
titulo: "Geração de suíte a partir do package (scaffold avançado)"
versao: "0.17.0"
data: "2026-10-09"
autor: "Gil Cleber Barboza"
versao_titulo: "0.17.0 — Persistência, multi-root e produtividade"
verificado: 2026-10-09
regras: []
tags: [prd]
---

# PRD-100 — Geração de suíte a partir do package (scaffold avançado)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.17.0 |
| Arquivos afetados | `src/scaffold.ts` (novo, puro), `src/extension.ts`, `src/plsqlDeclarations.ts` (reuso), `package.json`, `docs/brain/**` |
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
- Um comando e uma Code Action que geram um spec `ut_<pkg>.pks` com `%suite` e
  **um `%test` por rotina**.
- Suportar as **opções** de geração via settings (`utplsql.generate.*`).
- Aceitar como fonte o arquivo local **ou** o objeto compilado no banco.

**Não-objetivos**
- **Não** executar/compilar o pacote gerado nem escrever no banco.
- **Não** inferir asserções a partir do corpo (só nome de rotina + placeholder).
- **Não** substituir a PRD-59: o esqueleto simples continua funcionando.

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
- `%beforetest`/`%aftertest`, `%suitepath` e `%disabled` conforme opções.
- O resultado deve reabrir como spec válido no `suiteParser`.

### RF4 — Opções de geração (`utplsql.generate.*`)

| Setting | Efeito |
|---|---|
| `testPackagePrefix`/`testPackageSuffix` | prefixo/sufixo do nome da suíte |
| `testUnitPrefix`/`testUnitSuffix` | prefixo/sufixo do nome do `%test` |
| `numberOfTestsPerUnit` | testes por rotina (default 1) |
| `generateComments` | `-- TODO` por teste |
| `disableTests` | marca `--%disabled` |
| `suitePath` | valor de `--%suitepath` |
| `indentSpaces` | indentação do template |

### RF5 — Escrita segura

- Nunca sobrescrever arquivo existente sem confirmação; respeitar
  `sourcePath`/include patterns para o destino.

**Não-funcionais**
- RNF1 — `scaffold.ts` **puro** (sem `vscode`), testável com `node --test`.
- RNF2 — Sem novas dependências.
- RNF3 — Sem vazar caminhos absolutos em mensagens (SEC-002, logs).

## 5. Solução proposta

- `src/scaffold.ts` (novo): funções puras `buildSuiteTemplate(packageName, routines, options)` e
  `deriveRoutines(source, language)`; reusa `parsePlsqlDeclarations`.
- `src/extension.ts`: registra o comando e a Code Action; coleta opções via `readConfig()`.
- `src/config.ts` + `package.json`: os 9 settings `utplsql.generate.*`.
- Fallback de banco reaproveita `discovery.ts`/`oracleRunner.ts` (sem SQL novo).

## 6. Configuração

- Comando `utplsql.generateTestSuite`.
- Code Action em `**/*.pks`/`**/*.pkb`.
- Settings `utplsql.generate.testPackagePrefix` … `utplsql.generate.indentSpaces`.

## 7. Plano de testes

- **Unitários**: `out/test/unit/scaffold.test.js` — template com N rotinas,
  prefixos/sufixos, `numberOfTestsPerUnit`, `disableTests`; nome sem `ut_` vira
  `ut_<nome>`; saída parseável por `suiteParser`.
- **Integração**: gerar a partir de um objeto do banco (fixture) e validar o
  conteúdo; Code Action disponível só em produção.
- **Manual**: gerar para um `.pkb` → arquivo criado; gerar de novo → confirmação.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Sobrescrever spec existente | Confirmação explícita antes de gravar |
| Overloads/rotinas privadas | Só rotais da spec pública; seguir `parsePlsqlDeclarations` |
| Pacote muito grande gera arquivo enorme | `numberOfTestsPerUnit` + opção de omitir comentários |
| Divergência da PRD-59 | PRD-59 vira a base documentada; PRD-100 a estende |

## 9. Rollout

- **0.17.0** (produtividade), junto da PRD-59.
- Registrar no `CHANGELOG.md`; publicação via GitHub release (`publish.yml`).

## 10. Critérios de aceite

- Gerar de um package com 5 rotinas produz 5 `%test` válidos.
- Todas as 9 settings alteram a saída de forma previsível.
- Não sobrescreve sem confirmação; `npm test` e `lint` verdes.
- Coverage ≥ thresholds do `.c8rc`.

## 11. Questões em aberto

- Gerar também o **corpo** `.pkb` com `NULL;` em cada teste?
- Usar `%beforetest`/`%aftertest` por padrão ou só sob demanda?
- Nome do comando: `generateTestSuite` × `scaffoldSuite` (PRD-59)?

## 12. Impacto no cérebro

Na conclusão, criar a regra `BR-UI-*` que materializa "gerar suíte de teste não
sobrescreve spec existente e produz template parseável", com
`prds: ["PRD-100"]`, `implementacao:` e `testes:`, confirmando o vínculo
bidirecional (`npm run brain:rules`). Enquanto `proposed`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-30-schema-aware-organization|PRD-30]] · [[prd-42-suiteparser-annotations|PRD-42]] · [[prd-59-scaffold-suite|PRD-59]] · [[prd-79-coverage-scope|PRD-79]]
- 🔗 Mesma versão (0.17.0): [[prd-56-duration-persistence|PRD-56]] · [[prd-57-multiroot-root-resolution|PRD-57]] · [[prd-58-run-related-tests|PRD-58]] · [[prd-59-scaffold-suite|PRD-59]]
- 🚀 ⬅️ release anterior: [[prd-99-brain-reuse|PRD-99 (0.16.0)]] · ➡️ próxima release: [[prd-105-snippets|PRD-105 (0.18.0)]]
<!-- brain:auto:end -->
