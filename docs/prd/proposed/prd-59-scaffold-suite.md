# PRD-59 — Scaffold de suíte de teste

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.16.0 |
| Arquivos afetados | `src/extension.ts`, `src/scaffold.ts` (novo), `package.json` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Gerar o esqueleto de um spec de teste utPLSQL (`ut_<pkg>.pks`) a partir de um
package de produção selecionado. Java ("Generate Tests"), Go (`gotests`) e C#
(templates de projeto) fazem o equivalente. Reduz o atrito de iniciar uma nova
suíte.

## 2. Contexto e problema

Não há geração de testes; o usuário copia o boilerplate de `%suite`/`%test`
manualmente. O parser já conhece a estrutura de um spec; falta gerar.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Comando `utplsql.scaffoldSuite` que pede o objeto de produção e gera
  `ut_<pkg>.pks` com `%suite`, header e um `%test` de exemplo.
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

**Não-funcionais**
- RNF1 — Não sobrescrever arquivo existente sem confirmação.

## 5. Solução proposta

Novo módulo `scaffold.ts` (puro) + comando/code action em `extension.ts`.
Prompt de nome via `showInputBox`; escrita via `workspace.fs`.

## 6. Configuração

- Comando `utPLSQL: Gerar suíte de teste...`.
- Code action em `**/*.pks`/`.pkb` (a produção, não specs).

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

- Gerar um `%test` por procedure/function do `.pkb`? — Follow-up.
- Gerar também o corpo `.pkb` da suíte? — Follow-up.
