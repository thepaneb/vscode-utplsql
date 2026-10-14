---
tipo: prd
id: PRD-59
aliases: [PRD-59]
status: completed
titulo: "Scaffold de suíte de teste"
versao: "0.16.0"
data: "2026-09-06"
autor: "Gil Cleber Barboza"
versao_titulo: "0.16.0 — Produtividade e resultados"
verificado: 2026-10-14
regras: ["BR-UI-015"]
tags: [prd]
---

# PRD-59 — Scaffold de suíte de teste

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.16.0 |
| Arquivos afetados | `src/scaffold.ts` (novo, puro), `src/commands/scaffold.ts` (novo), `src/commands/deps.ts`, `src/extension.ts` (registro), `package.json` (comando + nls), `package.nls.json` + 23 `package.nls.*.json`, `src/i18nLocales.ts`, 24 notas `docs/brain/60-README/`, `docs/brain/70-Wiki/Commands.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Gerar o esqueleto de um spec de teste utPLSQL (`ut_<pkg>.pks`) a partir de um
package de produção selecionado. Java ("Generate Tests"), Go (`gotests`) e C#
(templates de projeto) fazem o equivalente. Reduz o atrito de iniciar uma nova
suíte.

> **Base da PRD-100.** Esta PRD entrega o **esqueleto** (`%suite` + um `%test`).
> A [[prd-100-generate-test-suite|PRD-100]] a estende com **um `%test` por
> rotina** e as opções `utplsql.generate.*` — implementadas juntas na **0.16.0**;
> o que aqui está listado como follow-up é o escopo da PRD-100.
>
> **Entrega única (decidido em 2026-10-14).** As PRD-59 e PRD-100 vão na **mesma
> branch/PR** (`feat/prd-59-100-scaffold`) e compartilham **um único comando**
> `utplsql.generateTestSuite`: sem rotinas parseáveis ele cai no esqueleto (esta
> PRD); com rotinas, gera um `%test` por rotina (PRD-100). Evita dois comandos,
> duas entradas de nls e dois fluxos de Code Action.

## 2. Contexto e problema

Não há geração de testes; o usuário copia o boilerplate de `%suite`/`%test`
manualmente. O parser já conhece a estrutura de um spec; falta gerar.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Comando `utplsql.generateTestSuite` (nome único, compartilhado com a PRD-100)
  que pede o objeto de produção e gera `ut_<pkg>.pks` com `%suite`, header e um
  `%test` de exemplo quando não há rotinas a extrair.
- Code Action no Explorer/editor para `.pks`/`.pkb` de produção.

**Não-objetivos**
- Inferir procedures/functions e gerar um `%test` por rotina (parse do corpo
  `.pkb` é follow-up — aqui só o esqueleto).
- Escrever no banco ou compilar.

## 4. Requisitos

### RF1 — Geração de template

```sql
CREATE OR REPLACE PACKAGE ut_app_pkg IS
  --%suite(Testes de app_pkg)

  --%test(retorna X quando ...)
  PROCEDURE dummy;
END ut_app_pkg;
```

Template parametrizado por nome do objeto e descrição (prompts).

### RF2 — Nome e local

Arquivo `ut_<objeto>.pks` no mesmo diretório do arquivo de produção (ou
perguntando o destino via `showSaveDialog`). Evitar sobrescrever existente.

### RF3 — Função pura

`buildSuiteTemplate(packageName, suiteDescription)` em `scaffold.ts`, testável
sem `vscode`.

### RF4 — Documentação e i18n da entrega (gate de CI)

Comando novo exige, **na mesma PR**:

- `package.nls.json` + **23** `package.nls.*.json` (título de paleta);
- catálogo de mensagens em `src/i18nLocales.ts` (prompts/avisos) — pt-BR base +
  23 locales;
- `docs/brain/70-Wiki/Commands.md` e a tabela de Commands do README (vault →
  `brain:build`);
- nenhuma setting nova **nesta PRD** (as 4 de núcleo são da PRD-100).

O `docs:check` (`docs-fidelity`) falha o CI se o comando não aparecer no README e
na wiki.

**Não-funcionais**
- RNF1 — Não sobrescrever arquivo existente sem confirmação.

## 5. Solução proposta

Novo módulo `scaffold.ts` (puro) + registro do comando/code action em
`src/commands/scaffold.ts`, exportado via `CommandDeps` (o registro real vive em
`src/commands/**`; `extension.ts` apenas delega em `registerXxxCommands(deps)`).
Prompt de nome via `showInputBox`; escrita via `workspace.fs`.

## 6. Configuração

- Comando `utplsql.generateTestSuite` (`utPLSQL: Gerar suíte de teste…`).
- Code action em `**/*.pks`/`.pkb` (a produção, não specs).
- Nenhuma setting nova nesta PRD.

## 7. Plano de testes

- **Unitários**: `buildSuiteTemplate` gera o conteúdo esperado; nome sem `ut_`
  vira `ut_<nome>`.
- **Manual**: gerar para um `.pkb` → arquivo `ut_*.pks` criado; gerar de novo →
  pedido de confirmação de sobrescrita.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Sobrescrever spec existente | Confirmação explícita antes de gravar. |
| Template incompleto para rotinas | Não-objetivo: só esqueleto; rotinas em follow-up. |

## 9. Rollout

- Release 0.16.0 (minor).
- CHANGELOG: "Scaffold de suíte utPLSQL".

## 10. Critérios de aceite

- `npm test` passa.
- Comando gera `ut_<pkg>.pks` válido e descoberto pelo parser.
- Não sobrescreve sem confirmação.

## 11. Questões em aberto

- Gerar um `%test` por procedure/function do `.pkb`? — **Fechado:** é o escopo da
  [[prd-100-generate-test-suite|PRD-100]], na mesma entrega.
- Gerar também o corpo `.pkb` da suíte? — **Fechado em 2026-10-14: não** (gera-se
  só a spec `.pks`; o corpo fica com o usuário). Ver §4 da PRD-100.
- Nome do comando (`scaffoldSuite` × `generateTestSuite`)? — **Fechado:
  `utplsql.generateTestSuite`**, único, compartilhado com a PRD-100.

## 12. Impacto no cérebro

Regra **compartilhada** com a PRD-100 (entrega única): **`BR-UI-015`** — “gerar
suíte de teste não sobrescreve spec existente e produz template parseável pelo
`suiteParser`” — criada em 2026-10-14 com `prds: ["PRD-59", "PRD-100"]`,
`implementacao:` (`src/scaffold.ts`, `src/commands/scaffold.ts`) e `testes:`
(`src/test/unit/scaffold.test.ts`). O `regras:` deste frontmatter é derivado pelo
`brain:sync`.

## 13. Implementado (2026-10-14)

Entregue junto da [[prd-100-generate-test-suite|PRD-100]] na branch
`feat/prd-59-100-scaffold` (regra BR-UI-015):

- **Comando único** `utplsql.generateTestSuite` (§11): a PRD-59 é a fase “sem
  rotinas” do mesmo comando — não existe `utplsql.scaffoldSuite` separado.
- **Sem header em prosa** no template: o `%suite` usa o **nome do objeto** como
  descrição (neutro e editável), evitando gravar prosa não traduzida no pacote do
  usuário. A função pura é `buildSuiteTemplate` (`src/scaffold.ts`), que gera o
  esqueleto quando a lista de rotinas é vazia.
- **Code Action** em produção (`.pks`/`.pkb`/`.sql`/`.fnc`/`.prc`/`.trg`), omitida
  em specs `ut_*`; o comando também aparece nos menus de contexto do editor e do
  Explorer e na paleta.
- RNF1 (não sobrescrever sem confirmação) está em `requisitos` da BR-UI-015.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 📐 Regras: [[BR-UI-015 - Gerar suite nao sobrescreve spec existente e produz template parseavel|BR-UI-015]]
- 🔗 PRDs relacionados: [[prd-100-generate-test-suite|PRD-100]]
- 🔗 Mesma versão (0.16.0): [[prd-56-duration-persistence|PRD-56]] · [[prd-57-multiroot-root-resolution|PRD-57]] · [[prd-58-run-related-tests|PRD-58]]
- 🎯 RF1 — Geração de template → [[BR-UI-015 - Gerar suite nao sobrescreve spec existente e produz template parseavel|BR-UI-015]]
- 🎯 RF2 — Nome e local → [[BR-UI-015 - Gerar suite nao sobrescreve spec existente e produz template parseavel|BR-UI-015]]
- 🎯 RNF1 — Não sobrescrever arquivo existente sem confirmação. → [[BR-UI-015 - Gerar suite nao sobrescreve spec existente e produz template parseavel|BR-UI-015]]
- 🚀 ⬅️ release anterior: [[prd-96-public-landing-page-github-pages|PRD-96 (0.15.0)]] · ➡️ próxima release: [[prd-105-snippets|PRD-105 (0.17.0)]]
<!-- brain:auto:end -->
