# PRD-19 — Normalização do sistema de PRDs

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-18 |
| Componente | Documentação `docs/prd/` |
| Versão alvo | 0.7.1 |
| Arquivos afetados | `docs/prd/completed/prd-01-java-mode.md`, `docs/prd/completed/prd-10-dynamic-reporters.md`, `docs/prd/index.md`, `docs/prd/proposed/prd-11-streaming-results.md`, `docs/prd/proposed/prd-12-sql-coverage.md`, `docs/prd/proposed/prd-17-java-args-setting.md`, `CHANGELOG.md` |

## 1. Resumo

Auditoria revelou 7 inconsistências no sistema de PRDs: headers desatualizados, campos com nome inconsistente, ordenação quebrada, títulos divergentes entre tabela e H1, e PRDs concluídos sem entrada no CHANGELOG. Este PRD corrige todas elas de uma vez.

## 2. Contexto e problema

Após a conclusão do PRD-10 (movido de `approved/` para `completed/`), uma auditoria completa encontrou:

| ID | Descrição |
|---|---|
| A1 | `prd-01-java-mode.md`: arquivo em `completed/` mas header `Status: Proposto` |
| A2 | `prd-10-dynamic-reporters.md`: campo `Versão` enquanto todos os outros usam `Versão alvo` |
| A3 | Tabela Concluídos no `index.md`: ordem quebrada (#07 entre #04 e #05; #10 no final após #16) |
| A4 | Títulos abreviados na tabela não batem com H1 (7 PRDs) |
| A5 | H1 inconsistentes: PRDs 01-12 `# PRD —`, PRDs 13-17 `# PRD-NN —` |
| #4  | PRD-16 (concluído em 0.6.0) sem entrada no CHANGELOG |
| #6  | PRDs 11, 12, 17 com "Versão alvo: 0.7.0" — versão já lançada |

## 3. Objetivos / Não-objetivos

**Objetivos**
- Corrigir status do PRD-01 para `Concluído`.
- Renomear campo `Versão` → `Versão alvo` no PRD-10.
- Ordenar tabela Concluídos numericamente (01–16).
- Alinhar títulos da tabela com H1 dos arquivos.
- Normalizar todos os H1 para o formato `# PRD-NN — Título`.
- Adicionar PRD-16 ao CHANGELOG 0.6.0.
- Atualizar versão alvo dos PRDs 11/12/17 para 0.8.0.
- Corrigir trailing spaces no CHANGELOG (0.2.4, 0.2.5).
- Adicionar `(PRD-01)` e `(PRD-02)` nos entries existentes do CHANGELOG.

**Não-objetivos**
- Alterar o conteúdo das PRDs além das correções listadas.
- Criar novas seções no `index.md`.

## 4. Requisitos

### RF1 — Corrigir header PRD-01

```diff
- | Status | Proposto |
+ | Status | Concluído |
```

### RF2 — Padronizar campo no PRD-10

```diff
- | Versão | 0.7.0 |
+ | Versão alvo | 0.7.0 |
```

### RF3 — Ordenar tabela Concluídos

Ordem atual: `01, 02, 03, 04, 07, 05, 06, 08, 09, 13, 14, 15, 16, 10`
Ordem correta: `01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 13, 14, 15, 16`

### RF4 — Alinhar títulos da tabela com H1

| PRD | Tabela atual | Deve ser |
|---|---|---|
| 01 | Modo de invocação `java` | Modo de invocação `java` (bypass do launcher) |
| 05 | Feedback de progresso e cancelamento | Feedback de progresso e cancelamento na UX |
| 08 | Opções CLI avançadas como settings | Opções CLI avançadas expostas como settings |
| 09 | Diagnóstico com info | Diagnóstico e validação com `utplsql info` |
| 10 | Reporters dinâmicos | Reporters dinâmicos com `utplsql reporters` |
| 11 | Streaming de resultados | Streaming de resultados em tempo real |
| 12 | Cobertura SQL (views) | Cobertura de código para objetos SQL (views, queries) |

### RF5 — Normalizar H1

Todos os arquivos PRD devem usar `# PRD-NN — Título`. PRDs 01-12 atualmente usam `# PRD — Título` (sem número). Corrigir para o formato do template.

### RF6 — Adicionar PRD-16 ao CHANGELOG 0.6.0

### RF7 — Atualizar versão alvo PRDs 11/12/17

De `0.7.0` para `0.8.0` (versão já lançada).

### RF8 — Correções cosméticas no CHANGELOG

- Remover trailing spaces após headers 0.2.4 e 0.2.5.
- Adicionar `(PRD-01)` e `(PRD-02)` nos entries relevantes.

## 5. Solução proposta

Correções manuais nos arquivos listados. Não requer código novo — apenas edições de documentação.

## 6. Configuração

Nenhuma.

## 7. Plano de testes

- **Validação**: rodar `sync-prds` ao final para garantir que o `.prd-issues.json` e labels do GitHub continuam consistentes.
- **Manual**: verificar que a tabela Concluídos e a árvore Estrutura em `index.md` estão consistentes entre si e com os arquivos em disco.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Edição em lote quebrar links do index.md | Todos os links são relativos ao arquivo — a renomeação de título na tabela não quebra links |
| `sync-prds` detectar inconsistência após edições | Rodar ao final para validar |

## 9. Rollout

- Release 0.7.1 (patch).
- Não requer publicação — é documentação interna.

## 10. Critérios de aceite

- `sync-prds` roda sem erros após todas as correções.
- Todos os headers `Status` batem com a pasta do arquivo.
- Tabela Concluídos ordenada numericamente.
- Todos os H1 usam formato `# PRD-NN — Título`.
- CHANGELOG 0.6.0 lista PRD-16.
- PRDs 11/12/17 apontam para 0.8.0.

## 11. Questões em aberto

- Nenhuma.
