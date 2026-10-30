<!-- GENERATED FROM docs/brain/20-PRDs/prd-138-organization-strategy-pattern.md — DO NOT EDIT -->

# PRD-138 — Padrão Strategy para organização da árvore de testes

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `src/testTree.ts`, `src/discovery.ts`, `src/test/unit/testTree.test.ts` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-57 (multiroot), PRD-75 (lazy tree), PRD-109 (language identity) |

## 1. Resumo

Extrair a lógica de organização da árvore (file/schema/tag) em um padrão Strategy,
com interface comum e implementações por modo, facilitando novos modos e testes
isolados.

## 2. Contexto e problema

- `testTree.ts` e `discovery.ts` tratam `file/schema/tag` com branches inline e
  condicionais aninhadas.
- Adicionar um novo modo (ex.: por owner) exige tocar vários pontos.
- Testes cobrem o comportamento agregado, dificultando isolar regressões por modo.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Definir `OrganizationStrategy` com `buildTree`, `resolveNode`, `collectAll`.
- Implementações `FileOrganization`, `SchemaOrganization`, `TagOrganization`.
- `doRefresh` delega ao strategy selecionado por `cfg.organization`.

**Não-objetivos**
- Mudar a UX ou os ids existentes dos itens.
- Alterar o protocolo de descoberta do banco.

## 4. Requisitos

### RF1 — Interface

- `interface OrganizationStrategy { build(controller, state, folders): Promise<void>; resolve(item); collectAll(root): TestItem[] }`.

### RF2 — Implementações

- Mover a lógica existente para as três classes sem mudança de comportamento.

### RF3 — Seleção

- Factory `createOrganizationStrategy(mode)`; `extension.ts`/`testTree.ts` usam a
  factory.

**Não-funcionais**
- RNF1 — Cobertura ≥ thresholds; nenhuma função > ~80 linhas.
- RNF2 — Comportamento idêntico (testes de regressão).

## 5. Solução proposta

- Criar `src/organization/` com `strategy.ts` (interface) e três implementações.
- Manter `testTree.ts` como fachada compatível.

## 6. Configuração

Nenhuma setting nova.

## 7. Plano de testes

- **Unitários**: cada strategy isoladamente (build/resolve/collect) com fixtures.
- **Regressão**: suíte atual de `testTree` verde.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Quebrar ids dos itens | Testes de snapshot dos ids gerados |
| Regressão no modo schema (lazy) | Testes de resolução lazy por nível |

## 9. Rollout

- 0.20.0; registrar no CHANGELOG.

## 10. Critérios de aceite

- Três strategies implementadas e selecionáveis.
- `doRefresh` delega; comportamento idêntico.
- Suíte verde.

## 11. Questões em aberto

- Vale extrair também a descoberta de banco (`discoverWorkspace`) para dentro da
  strategy de schema?

## 12. Impacto no cérebro

Ao concluir, criar regra `BR-ARCH-*` com `prds: ["PRD-138"]`. Enquanto `proposed`,
`regras: []`.

## Impacto nas docs

Superfície listada: CHANGELOG.
