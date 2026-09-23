---
tipo: prd
id: PRD-74
status: completed
titulo: "Descoberta de suítes direto do banco (`ut_runner.get_suites_info`)"
versao: "0.13.0"
data: "2026-09-19"
autor: "Gil Cleber Barboza"
verificado: 2026-09-23
tags: [prd]
---

# PRD-74 — Descoberta de suítes direto do banco (`ut_runner.get_suites_info`)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-19 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.13.0 |
| Arquivos afetados | `src/discovery.ts`, `src/testTree.ts`, `src/oracleRunner.ts`, `src/types.ts`, `src/config.ts`, `package.json`, `README.md` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |

## 1. Resumo

Passar a usar a API de metadados do utPLSQL (`ut_runner.get_suites_info`) como
fonte **canônica** da árvore de testes, além da descoberta por arquivos. A
árvore passa a refletir exatamente o que o banco reporta — inclusive suítes sem
`.pks` no workspace, `--%suitepath`, `--%tags` e `--%disabled` — e o mapeamento
para arquivos locais vira um enriquecimento, não a base. Referência de porte:
`paddi35/utplsql-for-vscode` (`src/db/utplsqlDao.ts`, `src/testing/controller.ts`).

## 2. Contexto e problema

Hoje `createRefresher` (`src/testTree.ts:247`) faz:

1. `discoverWorkspace(patterns)` — glob de `**/*.pks` + parse por regex
   (`src/discovery.ts:54`, `src/suiteParser.ts`);
2. no modo `schema`, `mergeDbSuites` complementa com `ALL_OBJECTS`/`ALL_SOURCE`
   (`src/discovery.ts:152`).

Essa abordagem tem limites:

- A fonte da verdade é o **arquivo**, então um package compilado sem `.pks` no
  workspace só aparece no modo `schema` e como `utplsql-db:/` (sem CodeLens,
  decorações ou jump to failure).
- `%suitepath`, `%disabled` no nível de suíte e a existência real do objeto no
  banco não são validados; o parser pode divergir do que o utPLSQL executará.
- O concorrente `paddi35` monta a árvore direto de `get_suites_info`, o que o
  torna utilizável sem qualquer código local.

A API `ut_runner.get_suites_info` existe a partir do utPLSQL **3.1.3** (o runner
já declara `UTPLSQL_MIN_VERSION = '3.1.0'` em `src/oracleRunner.ts:14`), então é
preciso gate de versão e fallback silencioso.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Consultar `ut_runner.get_suites_info` por schema e normalizar o resultado.
- Construir a árvore preferencialmente a partir do banco e **fundir** com a
  descoberta por arquivos quando o arquivo local existir.
- Manter o comportamento atual quando a API não existir/estiver inacessível
  (sem regressão).
- Expor um setting para escolher a fonte (`auto` | `file` | `database`).

**Não-objetivos**
- Árvore lazy / resolução incremental por nível (PRD-75).
- Filtros/agrupamento por tag (PRD-51/PRD-55).
- Remover a descoberta por arquivos (continua necessária para CodeLens/range).
- Passar `a_tags` ao run (PRD-69) ou UI de tags (PRD-51).

## 4. Requisitos

### RF1 — Wrapper da API

Nova função em `src/discovery.ts`, pura em relação a `oracledb` (recebe uma
conexão com `execute`), retornando linhas normalizadas:

```typescript
export interface DbSuiteRow {
  owner: string;
  packageName: string;
  suitePath: string | null;
  itemName: string;      // nome do item (suíte, contexto ou teste)
  itemType: string;      // 'suite' | 'context' | 'test'
  description: string | null;
  disabled: boolean;
  tags: string[];
  line: number;
}

export async function getSuitesInfo(
  conn: DiscoveryConnection,
  owner: string,
): Promise<DbSuiteRow[]>;
```

Consulta base (colunas exatas a confirmar no spike — ver §8):

```sql
SELECT * FROM TABLE(ut_runner.get_suites_info(a_owner => :owner))
```

Erros (`ORA-00904`, `ORA-00942`, versão antiga) ⇒ `[]` + `logger.debug`,
nunca lança.

### RF2 — Mapeamento para o modelo existente

Converter `DbSuiteRow` em `SuiteFile` (`src/discovery.ts:11`): uma suíte por
`packageName`, `tests` preenchidos a partir dos itens `test`, `suiteDescription`
do item `suite`, `dbSchema = owner`. Itens sem correspondência no parser de
arquivo recebem URI virtual `utplsql-db:/<OWNER>/<PKG>.pks` (reusa
`src/dbSourceProvider.ts`).

### RF3 — Política de fusão (DB-first)

Em `createRefresher`/`mergeDbSuites`: a lista final é a **união** por
`LOWER(packageName)`; quando existe `SuiteFile` vindo de arquivo, ele
prevalece para `uri`/`range`/`folder`, mas `tests` são reconciliados com os do
banco (o banco manda em `disabled`/tags/descrição). Suíte só-banco entra com URI
virtual.

### RF4 — Gate de versão

Antes da consulta, reutilizar `getOracleInfo` (`src/oracleRunner.ts:260`) e
`semverLt`. Se `utVersion < 3.1.3`, pular a descoberta DB e manter o
comportamento atual, logando uma vez.

### RF5 — Setting de fonte

`utplsql.discovery.source` (`"auto" | "file" | "database"`, default `"auto"`).
`auto` = DB quando a conexão e a versão permitirem, senão arquivo.

**Não-funcionais**
- RNF1 — Uma consulta por schema, não por pacote (evita N+1).
- RNF2 — Sem novas chaves de i18n de runtime (usar `logger`); se inevitável,
  atualizar os 24 catálogos.
- RNF3 — Sem conexão configurada, `get_suites_info` não é chamado (nunca
  abre prompt na ativação).
- RNF4 — Thresholds de cobertura c8 mantidos (90/85/90).

## 5. Solução proposta

### 5.1 `src/discovery.ts`

- `getSuitesInfo(conn, owner)` (RF1) + `mapSuitesInfoToSuiteFiles(rows, folder)`
  (RF2), ambos testáveis sem `vscode`.
- `discoverDbSuites(connStr, schemas, folders)` orquestra pool + timeout de 10s
  (mesmo padrão de `discoverSchemaFromDb`, `src/discovery.ts:222`).

### 5.2 `src/testTree.ts`

- `doRefresh` passa a montar `dbSuites` antes de `buildFileTree`/`buildSchemaTree`
  e a aplicar a fusão (RF3) dentro de `mergeDbSuites`.
- Manter `discoverWorkspace` como fallback e para resolver `uri`/`range`.

### 5.3 `src/config.ts` / `package.json`

- `UtConfig.discoverySource` e leitura da setting (RF5).

## 6. Configuração

- Setting `utplsql.discovery.source` (`auto` | `file` | `database`) — default
  `auto`.
- Sem comando/keybinding novo. README: nova linha na tabela de config.

## 7. Plano de testes

- **Unitários** (`discovery.test.ts` com conn fake): linhas de suíte/contexto/
  teste viram `SuiteFile`/`tests` corretos; `disabled` e `tags` propagados;
  `get_suites_info` lançando ⇒ `[]`; versão antiga ⇒ fallback sem consulta.
- **Unitários**: política de fusão (arquivo prevalece em `uri`, banco em
  `disabled`; duplicata não gera dois itens).
- **Integração** (`.env`/`describeDB`): schema com suíte que tem `.pks` local e
  outra que só existe no banco ⇒ ambas na árvore; `utplsql.discovery.source =
  "file"` desliga a consulta.
- **Manual**: workspace sem fontes locais mostra a árvore completa; jump to
  failure abre `utplsql-db:/`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Assinatura/colunas de `get_suites_info` variam entre 3.1.x e 3.2.x | Spike em banco real nas versões alvo antes de codar; normalizador tolerante a nomes de coluna (array e objeto). |
| Shared install sem grants de leitura | Falha silenciosa + log; fallback para descoberta por arquivo. |
| N+1 por pacote | Uma consulta por schema (RNF1); cache por refresh. |
| Suíte DB e arquivo com nomes divergentes de testes | Chave de casamento `LOWER(packageName)` + `LOWER(procName)`; órfãos mantidos do lado do banco. |
| Performance em schemas grandes | Combinar com PRD-75 (lazy); medir com o fixture de perf se necessário. |

## 9. Rollout

- Release 0.13.0 (minor), default `auto` mantendo comportamento atual quando não
  houver diferença.
- `CHANGELOG.md`: "Descoberta de suítes direto do banco (`get_suites_info`)".
- Se houver regressão, o setting permite voltar para `file` sem downgrade.

## 10. Critérios de aceite

- `npm run test:unit` e `npm run lint` passam.
- Um objeto compilado sem `.pks` local aparece na árvore no modo `file`.
- Sem conexão/versão antiga, a árvore é idêntica à atual.
- `utplsql.discovery.source = "file"` reproduz o comportamento da versão anterior.
- README (variantes + wiki) atualizado e `brain:sync`/`docs:check` consistentes.

## 11. Questões em aberto

- `get_suites_info` filtra por `a_include_disabled`? Se sim, exibir itens
  desabilitados na árvore (hoje são omitidos) ou manter o filtro atual?
- Reconciliar `line` do banco com a linha do arquivo local — usar a do banco
  para range em `utplsql-db:/` e a do arquivo quando houver arquivo?
- Cachear `get_suites_info` entre refreshes (invalidação por DDL)?

## 12. Notas de implementação (0.13.0)

- **Assinatura real**: `ut_runner.get_suites_info(a_owner, a_package_name)`
  (pipelined) — consultada como `SELECT ... FROM TABLE(get_suites_info(:owner,
  null))`. A forma `a_owner => :owner` do RF1 não existe; o segundo parâmetro
  nulo traz todos os packages do owner. Confirmado na fonte do utPLSQL 3.2.3
  (`api/ut_runner.pks`, `api/ut_suite_item_info.tps`).
- **Colunas**: `object_owner`, `object_name`, `item_name`, `item_description`,
  `item_type` (`UT_SUITE`/`UT_SUITE_CONTEXT`/`UT_TEST`), `item_line_no`, `path`,
  `disabled_flag`, `disabled_reason`, `tags`. Linhas `disabled` são omitidas,
  como na descoberta por arquivo.
- **Escopo entregue**: wrapper `getSuitesInfo`, mapeamento
  `mapSuitesInfoToSuiteFiles`, fusão `mergeSuiteLists` (arquivo prevalece em
  URI/linha; banco em descrição/tags) e orquestrador `discoverDbSuites` com gate
  de versão (≥ 3.1.3) e fallback para `ALL_SOURCE`. A setting
  `utplsql.discovery.source` controla o modo.
- **Não implementado**: cache entre refreshes e exibição de itens desabilitados
  (permanecem omitidos); árvore lazy é a PRD-75. A validação em banco real fica
  para a suíte de integração (a API só existe no servidor).
