---
tipo: prd
id: PRD-79
aliases: [PRD-79]
status: completed
titulo: "Escopo avançado de cobertura (regex include/exclude + `excludeObjects`)"
versao: "0.13.0"
data: "2026-09-19"
autor: "Gil Cleber Barboza"
verificado: 2026-09-23
tags: [prd]
---

# PRD-79 — Escopo avançado de cobertura (regex include/exclude + `excludeObjects`)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-19 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.13.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/config.ts`, `package.json`, `README.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-69 (§11 menciona `a_include_schema_expr`) |

## 1. Resumo

Expor o controle fino de escopo de cobertura do utPLSQL: listas de objetos
incluídos/excluídos (`a_include_objects`/`a_exclude_objects`) e expressões
regulares de schema/objeto (`ut_coverage_options`). Permite excluir o próprio
framework utPLSQL quando instalado no mesmo schema e incluir objetos alcançados
apenas dinamicamente (`execute immediate`, triggers), que não aparecem em
`*_dependencies`. Referência de porte:
`paddi35/utplsql-for-vscode` (`src/testing/coverageScope.ts`,
`utplsql.coverage.*`).

## 2. Contexto e problema

Hoje o escopo de cobertura é uma única linha:

```typescript
// src/oracleRunner.ts:538
coverageSchemes = `ut_varchar2_list('${owner.replace(/'/g, "''")}')`;
```

Ou seja, cobre o **schema inteiro** do owner (ou `utplsql.coverageOwner`), sem
excluir o utPLSQL, sem incluir objetos dinâmicos e sem recorte por regex. Em
instalações per-schema isso gera ruído (objetos `UT_*`) e em shared install o
escopo fica grosseiro. O utPLSQL oferece `a_include_objects`/`a_exclude_objects`
no `ut_runner.run` e `ut_coverage_options` para os reporters de cobertura.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Settings para excluir objetos do framework/ruído e para sobrepor as listas.
- Suporte a regex de schema/objeto via `ut_coverage_options`.
- Manter o comportamento atual como default (owner único).

**Não-objetivos**
- Cobertura de branch (PRD-60, investigação).
- Trocar o formato de cobertura nativo (segue Cobertura → Coverage API).
- UI gráfica de escopo (só settings).

## 4. Requisitos

### RF1 — Exclusões

`utplsql.coverage.excludeObjects: string[]` (default `[]`), somado aos objetos
do framework quando o utPLSQL estiver no mesmo schema do código testado
(ex.: `UT`, `UT_EXPECTATION`, `UT_*`). Alimenta `a_exclude_objects`.

### RF2 — Overrides de escopo

- `utplsql.coverage.schemes: string[]` — sobrepõe `a_coverage_schemes` (vazio =
  automático pelo owner).
- `utplsql.coverage.includeObjects: string[]` — sobrepõe `a_include_objects`
  (vazio = automático).

### RF3 — Regex

- `utplsql.coverage.includeSchemaExpr`, `includeObjectExpr`,
  `excludeSchemaExpr`, `excludeObjectExpr` (strings, default `""`).
- Montar `ut_coverage_options(...)` e passá-lo ao reporter de cobertura
  (`ut_coverage_cobertura_reporter(<options>)`; nome/ordem dos parâmetros a
  confirmar no spike — §8).

### RF4 — Binds seguros

Seguindo a PRD-69, usar binds tipados (`UT_VARCHAR2_LIST`) para as listas e
bind `STRING` para as regex. Nenhum valor do usuário concatenado no PL/SQL.

**Não-funcionais**
- RNF1 — Default preserva o SQL atual (owner único, sem options).
- RNF2 — Regex inválida no banco não derruba o run normal; erro aparece no
  Output e a cobertura é pulada naquele run.
- RNF3 — Thresholds c8 mantidos.

## 5. Solução proposta

### 5.1 `src/oracleRunner.ts`

- Em `executeRunOracle`: montar `a_exclude_objects`/`a_include_objects` e
  `a_coverage_schemes` a partir do config; envolver o reporter de cobertura com
  `ut_coverage_options(...)` quando houver regex.
- Manter a validação existente de reporter (`checkReporterExists`) e o
  `mapDbPathsToFiles`.

### 5.2 `src/config.ts`

- Novos campos em `UtConfig` e leitura das settings.

### 5.3 `package.json` / `README.md`

- Settings e documentação (tabela de config + seção Cobertura).

## 6. Configuração

| Setting | Default |
|---|---|
| `utplsql.coverage.excludeObjects` | `[]` |
| `utplsql.coverage.schemes` | `[]` |
| `utplsql.coverage.includeObjects` | `[]` |
| `utplsql.coverage.includeSchemaExpr` | `""` |
| `utplsql.coverage.includeObjectExpr` | `""` |
| `utplsql.coverage.excludeSchemaExpr` | `""` |
| `utplsql.coverage.excludeObjectExpr` | `""` |

## 7. Plano de testes

- **Unitários**: montagem do `ut_runner.run`/reporter com cada combinação;
  defaults não adicionam cláusulas; listas viram binds; regex inválida gera
  mensagem e pula cobertura.
- **Integração**: objeto do framework aparece no XML sem `excludeObjects` e some
  com; objeto só-dinâmico entra via `includeObjects`.
- **Manual**: cobertura com/sem exclusões no Test Coverage.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `ut_coverage_options` ter assinatura/versão diferente | Spike nos `ut_coverage_*.pks`; fallback sem options se `ORA-06550`. |
| `a_include_objects` vazio ≠ todos | Tratar `[]` como "não enviar" (igual `null`). |
| Regex mal formada consumir CPU no banco | Documentar; erro é capturado e não bloqueia. |
| Listas grandes no bind | `UT_VARCHAR2_LIST` (PRD-69) sem limite prático. |

## 9. Rollout

- Release 0.13.0 (minor), default idêntico ao atual.
- `CHANGELOG.md`: "Escopo avançado de cobertura (regex e exclusões)".

## 10. Critérios de aceite

- `npm run test:unit` e `npm run lint` passam.
- Sem configuração, o XML de cobertura é igual ao da versão anterior.
- `excludeObjects` remove o framework do relatório.
- `includeObjects` adiciona objeto dinâmico.
- README/wiki atualizados; `docs:check` verde.

## 11. Questões em aberto

- Detectar automaticamente o schema do utPLSQL (`discoverUtplsqlSchema`) e
  excluí-lo por default? (hoje a PRD-74 descobre o prefixo)
- Expor `utplsql.coverage.reporter` (sonar/cobertura) junto desta PRD?

## 12. Notas de implementação (0.13.0)

- **Onde o escopo é aplicado**: no utPLSQL 3.x o `ut_coverage_cobertura_reporter`
  **não** recebe opções (o construtor só tem `self`). O escopo é passado ao
  `ut_runner.run` (`a_include_objects`, `a_exclude_objects`,
  `a_include_schema_expr`, `a_include_object_expr`, `a_exclude_schema_expr`,
  `a_exclude_object_expr`), que monta o `ut_coverage_options` internamente.
  Confirmado na fonte do utPLSQL 3.2.3 (`api/ut_runner.pks`,
  `core/types/ut_coverage_options.tps`). A menção a
  `ut_coverage_cobertura_reporter(<options>)` no RF3 não corresponde à API real.
- **Exclusão automática do framework**: não implementada. `a_exclude_objects`
  exige nomes explícitos (`OWNER.NAME`), sem wildcard; para excluir o framework
  o caminho suportado é a regex `utplsql.coverage.excludeObjectExpr` (ex.:
  `^UT_`).
- **RNF2 (regex inválida não derruba o run)**: não implementado. Uma regex
  inválida aborta o `ut_runner.run` e o erro aparece no Output (fluxo atual de
  `runner.oracleError`); não há retry sem cobertura para não executar os testes
  duas vezes.
- **Testes**: unitários cobrem os binds de listas e regex e a ausência dos
  parâmetros no default; validação em banco real fica para a suíte de integração.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-60-branch-coverage-investigation|PRD-60]] · [[prd-69-oracle-runner-typed-binds|PRD-69]] · [[prd-74-db-first-discovery|PRD-74]]
<!-- brain:auto:end -->
