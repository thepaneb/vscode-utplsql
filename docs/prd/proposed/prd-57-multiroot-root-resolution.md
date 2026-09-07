# PRD-57 — Multi-root: resolução de `root`/`sourcePath` por folder

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.15.0 |
| Arquivos afetados | `src/runner.ts`, `src/oracleRunner.ts`, `src/coverage.ts`, `src/config.ts` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Corrigir a resolução de `root` (raiz do workspace) e `sourcePath` para
considerar o folder do pacote em execução, em vez de sempre o primeiro folder
(`runner.ts:49`). O PRD-06 já tornou o discovery/cobertura multi-root, mas a
execução ainda usa `folders[0]`. Jest, Python e Go tratam multi-root por
folder.

## 2. Contexto e problema

`executeRun` usa `const root = folders[0].uri.fsPath` para `sourcePath` e
cobertura. Em workspaces multi-folder, testes de um segundo folder resolvem a
cobertura contra a raiz errada. `applyCoverageFromXml` já itera `folders`
(`results.ts:167`), mas o `sourcePath` é global e relativo ao primeiro folder.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Derivar `root` por suite/package a partir de `meta.folder`.
- Permitir `sourcePath` relativo a cada folder (não só ao primeiro).
- Manter comportamento idêntico para workspace com um único folder.

**Não-objetivos**
- `sourcePath` distinto por folder via settings separadas (follow-up; hoje um
  único `utplsql.sourcePath` global, relativo ao folder de cada pacote).
- Re-fatorar todo o discovery (já multi-root no PRD-06).

## 4. Requisitos

### RF1 — `root` por folder

Quando `request.include` traz itens de um único folder, usar `meta.folder.uri.fsPath`
como `root`. Quando há múltiplos folders, agrupar por folder e resolver
cobertura com o folder correto de cada objeto.

### RF2 — `sourcePath` resolvido contra o folder do item

A resolução de cobertura (`coverage.ts` / `applyCoverageFromXml`) deve resolver
`sourcePath` contra o folder do item (não globalmente contra `folders[0]`).

### RF3 — Sem quebra em single-root

Workspace com um folder → comportamento idêntico ao atual (regressão zero).

**Não-funcionais**
- RNF1 — Não alterar a assinatura pública de `executeRun`/`executeRunOracle`
  além do necessário.
- RNF2 — Cobrir com testes de integração multi-root (fixtures já existem no
  PRD-06).

## 5. Solução proposta

- `runner.ts`: substituir `folders[0]` pela resolução de `root` por folder
  (helper `resolveRoot(items, folders)`).
- `oracleRunner.ts`/`coverage.ts`: receber `root`/`sourcePath` já resolvidos por
  folder (o `executeRunOracle` já aceita `folders`).

## 6. Configuração

Nenhuma setting nova. README: remover/atualizar a limitação "Considera o
primeiro workspace folder para resolver sourcePath" (seção Limitações).

## 7. Plano de testes

- **Unitários**: `resolveRoot` escolhe o folder correto para itens de um
  folder e retorna fallback para múltiplos.
- **Integração**: workspace com 2 folders + cobertura → gutters mapeiam para o
  folder certo de cada pacote.
- **Manual**: single-root inalterado.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regressão no mapeamento de cobertura single-root | Teste de regressão dedicado + comportamento idêntico quando um único folder. |
| `sourcePath` relativo ambíguo em multi-root | Resolver contra o folder do pacote; documentar. |

## 9. Rollout

- Release 0.15.0 (minor).
- CHANGELOG: "Multi-root: cobertura resolve root/sourcePath por folder".

## 10. Critérios de aceite

- `npm test` passa.
- Cobertura em multi-root mapeia corretamente por folder.
- Single-root inalterado.

## 11. Questões em aberto

- Permitir `sourcePath` por folder via `utplsql.profiles` ou settings por
  folder? — Follow-up (PRD-34 já tem overrides por perfil).
