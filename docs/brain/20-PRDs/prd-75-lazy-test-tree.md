---
tipo: prd
id: PRD-75
status: proposed
titulo: "Árvore de testes lazy (resolução incremental por nível)"
versao: "0.14.0"
data: "2026-09-19"
autor: "Gil Cleber Barboza"
versao_titulo: "0.14.0 — Árvore, relatórios, conectividade e segurança"
verificado: 2026-09-23
tags: [prd]
---

# PRD-75 — Árvore de testes lazy (resolução incremental por nível)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-19 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.14.0 |
| Arquivos afetados | `src/testTree.ts`, `src/extension.ts`, `src/discovery.ts`, `src/state.ts`, `src/types.ts` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |

## 1. Resumo

Construir os nós do Test Explorer sob demanda: ao expandir um schema/pacote/
suíte, apenas aquele nível é resolvido, em vez de materializar toda a árvore a
cada `refresh()`. Em schemas com centenas de packages, o tempo de abertura e o
custo de memória caem de forma proporcional. Referência de porte:
`paddi35/utplsql-for-vscode` (`src/testing/controller.ts`, árvore lazy).

## 2. Contexto e problema

`doRefresh` (`src/testTree.ts:247`) reconstrói a árvore inteira:

- `discoverWorkspace` lê e faz parse de **todos** os `.pks`;
- `mergeDbSuites` consulta o banco por schema e traz **todas** as suítes;
- `buildFileTree`/`buildSchemaTree` criam `TestItem` de tudo e enchem
  `state.cachedItems`.

O `TestController.resolveHandler` hoje só dispara o refresh no nó raiz
(`src/extension.ts:44`). O custo cresce com o tamanho do schema e o usuário paga
por dados que talvez nunca abra.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Resolver filhos sob demanda por nível (raiz → schema → package → suíte →
  teste), usando `resolveHandler(item)`.
- Manter o resultado dos testes e a identidade dos `TestItem` estáveis entre
  resoluções (mesmos IDs).
- Limitar o custo de abertura ao nível visível.

**Não-objetivos**
- Descoberta DB-first (PRD-74) — pré-requisito recomendado, mas a árvore lazy
  pode ser aplicada também ao modo `file`.
- Virtualização/incremental do parser de arquivos.
- Mudar o modelo de resultados (`applyResults`).

## 4. Requisitos

### RF1 — Resolvedor por nó

`TestController.resolveHandler` passa a decidir pelo prefixo do `id` do item:

```typescript
if (!item) { await resolveRoot(); return; }
if (item.id.startsWith('schema:')) await resolveSchema(item);
else if (item.id.startsWith('package:')) await resolvePackage(item);
else if (item.id.startsWith('suite:')) await resolveSuite(item);
```

- `resolveRoot` cria os itens de schema (modo `schema`) ou as suítes de arquivo
  (modo `file`, que naturalmente já é por arquivo).
- `resolvePackage` consulta as suítes do package (banco ou arquivos) e cria os
  filhos `suite:`.
- `resolveSuite` preenche os `test:` (parse do arquivo ou linhas do banco).

### RF2 — Cache de resolução

Guardar em `state` um `Set<string>` de IDs já resolvidos (`resolvedNodes`) e
invalidar em `doRefresh`. Cada nó tem `item.canResolveChildren = true` enquanto
não resolvido.

### RF3 — IDs estáveis

Manter os formatos atuais (`schema:`, `package:`, `suite:`, `test:`) para não
quebrar `state.getSuiteItem`, `applyResults` e decorações. `util/ids` pode ser
extraído para um helper puro testável.

### RF4 — Resultados e re-run

Após um run, a árvore pode ter nós não resolvidos; `collectAllItems` deve
resolver sob demanda antes de montar o `TestRunRequest` (ou o comando deve
resolver os alvos necessários). `state.lastResults`/`lastFailedItems` continuam
funcionando pelos IDs.

**Não-funcionais**
- RNF1 — Abrir um workspace com N packages não deve consultar o banco para os
  não expandidos.
- RNF2 — Nenhuma chamada de rede durante a renderização do nó já cacheado.
- RNF3 — `npm test` e thresholds c8 mantidos.

## 5. Solução proposta

### 5.1 `src/testTree.ts`

- Reescrever `buildSchemaTree` como um conjunto de `resolve*` que chamam
  `controller.createTestItem` apenas para o nível pedido e adicionam via
  `item.children.add`.
- `createRefresher` dispara apenas a resolução da raiz; o resto fica a cargo do
  `resolveHandler`.

### 5.2 `src/state.ts`

- `resolvedNodes: Set<string>`, `markResolved(id)`, `isResolved(id)`,
  `clearResolved()`.
- Ajustar `collectAllItems` para percorrer somente o que estiver resolvido e
  sinalizar ao caller que faltam nós.

### 5.3 `src/extension.ts`

- `resolveHandler` delega para `testTree` e mantém o `refreshHandler` para o
  botão de refresh (que limpa `resolvedNodes` e resolve a raiz).

## 6. Configuração

- Nenhuma setting nova. Nenhum comando novo.

## 7. Plano de testes

- **Unitários**: `resolveSchema`/`resolvePackage`/`resolveSuite` criam apenas o
  nível esperado e marcam `resolvedNodes`; IDs estáveis; cache evita consulta
  repetida.
- **Unitários**: `collectAllItems` resolve sob demanda e não duplica itens.
- **Integração**: schema com N packages; expandir um package não consulta os
  demais (assert via contagem de queries no fake/DB).
- **Manual**: workspace grande abre rápido; expandir não trava a UI.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `collectAllItems` incompleto após lazy | Resolver sob demanda antes de montar o `TestRunRequest`; teste de regressão para "Run All". |
| `resolveHandler` não é chamado em todos os casos (ex.: busca/filtro) | Manter fallback que resolve a árvore completa quando solicitado explicitamente (ex.: `Run All`, `Refresh`). |
| IDs antigos vs novos | Reutilizar os formatos atuais; teste que compara IDs com a versão anterior. |
| Interação com PRD-74 (uma query por schema) | Resolver schema no primeiro expandir; cachear por nó. |

## 9. Rollout

- Release 0.14.0 (minor).
- `CHANGELOG.md`: "Árvore de testes lazy (resolução por nível)".

## 10. Critérios de aceite

- `npm run test:unit` e `npm run lint` passam.
- Abrir um schema com muitos packages não resolve os níveis não expandidos.
- "Run All"/"Run Failed" continuam funcionando com nós não resolvidos.
- Nenhuma regressão de cobertura c8.

## 11. Questões em aberto

- Resolver a suíte também ao aplicar decorações/CodeLens sem expandir?
- Persistir `resolvedNodes` entre sessões ou sempre revalidar no refresh?

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-74-db-first-discovery|PRD-74]]
- 🔗 Mesma versão (0.14.0): [[prd-47-node-26-toolchain|PRD-47]] · [[prd-76-reporter-export|PRD-76]] · [[prd-80-virtual-db-source|PRD-80]] · [[prd-81-security-hardening|PRD-81]] · [[prd-82-tns-wallet|PRD-82]]
<!-- brain:auto:end -->
