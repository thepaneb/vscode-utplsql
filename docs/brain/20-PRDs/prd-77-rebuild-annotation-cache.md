---
tipo: prd
id: PRD-77
aliases: [PRD-77]
status: completed
titulo: "Reconstruir o cache de anotações do utPLSQL"
versao: "0.13.0"
data: "2026-09-19"
autor: "Gil Cleber Barboza"
verificado: 2026-09-23
tags: [prd]
---

# PRD-77 — Reconstruir o cache de anotações do utPLSQL

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-19 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.13.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/commands/utility.ts`, `src/commands/deps.ts`, `src/testTree.ts`, `package.json`, `README.md` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Depende de | PRD-74 (descoberta DB-first) |

## 1. Resumo

Comando `utPLSQL: Rebuild Annotation Cache` que força a reconstrução do cache
de `--%annotations` do utPLSQL no banco e atualiza o Test Explorer. Sem isso,
um `--%test` recém-adicionado pode não aparecer quando a árvore vem de
`get_suites_info` (PRD-74), pois a API lê do cache. Referência de porte:
`paddi35/utplsql-for-vscode` (`utplsql.rebuildAnnotations`).

## 2. Contexto e problema

Hoje a descoberta por arquivos (`src/discovery.ts`) faz o parse das anotações
diretamente no texto, então o cache do banco não importa. Com a PRD-74
(DB-first), a fonte passa a ser `ut_runner.get_suites_info`, que consulta as
tabelas de cache de anotação mantidas pela DDL trigger do utPLSQL. Se o cache
estiver desatualizado (DDL trigger ausente/inativo, recompilação manual), a
árvore não reflete o código e não há botão para corrigir — o usuário precisaria
rodar PL/SQL no banco.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Comando que invoca a rotina de reconstrução do cache de anotações.
- Ao final, `refresh()` da árvore.
- Mensagem de sucesso/erro no Output channel.

**Não-objetivos**
- Detectar automaticamente cache desatualizado (só comando manual).
- Instalar/corrigir a DDL trigger do utPLSQL.
- Substituir o parser local de arquivos.

## 4. Requisitos

### RF1 — Identificar a rotina correta

Spike obrigatório: confirmar a rotina pública de rebuild na versão alvo do
utPLSQL (candidatos: `ut_annotation_cache_manager` e/ou o prefixo descoberto por
`discoverUtplsqlSchema`, `src/oracleRunner.ts:170`). Implementar uma função:

```typescript
export async function rebuildAnnotationCache(
  oracledb: typeof import('oracledb'),
  connection: string,
  cfg: UtConfig,
): Promise<void>;
```

que abre conexão via `withOracleConnection` (`src/oracleRunner.ts:114`), chama a
rotina e propaga erro tratado.

### RF2 — Comando e refresh

`utPLSQL: Rebuild Annotation Cache` (`utplsql.rebuildAnnotations`):
- sem conexão ⇒ aviso pedindo conexão (não abre prompt surpresa);
- erro ⇒ `showErrorMessage` + log, sem derrubar a extensão;
- sucesso ⇒ `refresh()` e info no Output.

### RF3 — Gate de versão

Só disponível quando `utVersion >= 3.1.0` (a rotina existe nas versões
suportadas) e a conexão resolve sem prompt. Caso contrário, comando oculto/aviso.

### RF4 — Menu

Paleta + eventualmente `view/title` do Testing view (ícone `$(refresh)` já é
usado pelo refresh; usar `$(symbol-method)` ou manter só paleta).

**Não-funcionais**
- RNF1 — Operação idempotente e segura de rodar repetidas vezes.
- RNF2 — Timeout curto (`callTimeout`) para não pendurar a UI.
- RNF3 — Paridade i18n se houver mensagem de runtime.

## 5. Solução proposta

### 5.1 `src/oracleRunner.ts`

- `rebuildAnnotationCache(...)` usando `withOracleConnection` e o prefixo de
  `discoverUtplsqlSchema` quando a rotina estiver no schema UT3.

### 5.2 `src/commands/utility.ts`

- Registrar o comando; depender de `deps.refresh` (`src/commands/deps.ts`).

### 5.3 `package.json` / `README.md`

- Comando e tabela de comandos/README.

## 6. Configuração

- Comando `utPLSQL: Rebuild Annotation Cache`. Nenhuma setting nova.

## 7. Plano de testes

- **Unitários**: função monta o PL/SQL com o prefixo descoberto; erro da
  conexão não lança; sem conexão retorna cedo.
- **Integração**: fixture com DDL trigger desabilitada → rebuild → nova suíte
  aparece.
- **Manual**: adicionar `--%test`, rodar o comando, ver o teste na árvore.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Nome da rotina divergir entre versões | Spike + detecção de `ORA-06550`/`ORA-00904` com mensagem clara. |
| Operação custosa em schemas enormes | Aviso de confirmação antes de rodar. |
| Rebuild exigir grants | Mensagem amigável com o grant necessário no Output. |

## 9. Rollout

- Release 0.13.0 (minor), junto da PRD-74.
- `CHANGELOG.md`: "Comando para reconstruir o cache de anotações do utPLSQL".

## 10. Critérios de aceite

- `npm run test:unit` e `npm run lint` passam.
- Comando reconstrói o cache e atualiza a árvore.
- Erro de grants/versão não quebra a extensão e orienta o usuário.

## 11. Questões em aberto

- Executar o rebuild automaticamente quando a PRD-74 detectar divergência entre
  arquivo e banco? (follow-up)
- Expor também em `view/title` do Testing view?

## 12. Notas de implementação (0.13.0)

- **Rotina confirmada**: `ut_runner.rebuild_annotation_cache(a_object_owner
  varchar2, a_object_type varchar2 := null)` (`api/ut_runner.pks`, utPLSQL
  3.2.3). O comando usa o usuário da conexão como owner. `ut_annotation_manager`
  /`ut_annotation_cache_manager` são internos e não foram usados.
- **Escopo entregue**: `rebuildAnnotationCache(oracledb, connection, cfg)` em
  `oracleRunner.ts` (via `withOracleConnection`) e o comando
  `utplsql.rebuildAnnotations` na paleta (`utility.ts`), com refresh da árvore,
  aviso quando não há conexão (sem prompt surpresa) e erro no Output.
- **Gate de versão**: não foi adicionado um gate específico — a rotina existe
  desde versões anteriores ao mínimo suportado (`UTPLSQL_MIN_VERSION` 3.1.0);
  um banco sem a rotina falha com ORA e a mensagem aparece no Output.
- **Menu**: apenas paleta (não foi adicionado botão em `view/title`).
- **Testes**: unitários cobrem a montagem da chamada (SQL + bind do owner) e a
  falha de conexão; o efeito real no cache é validado na suíte de integração.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-74-db-first-discovery|PRD-74]]
<!-- brain:auto:end -->
