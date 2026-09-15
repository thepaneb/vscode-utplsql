# PRD-60 — Cobertura de branch (investigação de viabilidade)

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | Investigação — sem versão alvo |
| Arquivos afetados | `src/cobertura.ts`, `src/results.ts`, `src/test/unit/cobertura.test.ts` |
| Esforço estimado | 0,5–1 dia (investigação) |
| Complexidade | Alta (depende do framework) |

## 1. Resumo

Investigar se o utPLSQL (via `ut_coverage_cobertura_reporter`) expõe dados de
branch e, em caso positivo, mapeá-los para `vscode.BranchCoverage`. Python e
C# reportam branch coverage. PL/SQL cobre por *bloco*, não por linha/ramo — a
viabilidade é incerta e depende do que o reporter emite.

## 2. Contexto e problema

A cobertura atual é `StatementCoverage`/`DeclarationCoverage`
(`results.ts:172-186`). O VSCode suporta `BranchCoverage` (pares de linha+ramo
com hits), mas o Cobertura XML do utPLSQL historicamente não emite atributo
`branch`. Antes de qualquer implementação, é preciso confirmar o formato real.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Levantar o schema do Cobertura XML do utPLSQL (existe `branch`/`branches`?).
- Prototipar o parse caso exista.
- Documentar o resultado (viável / não viável) e o caminho.

**Não-objetivos**
- Implementar branch coverage completo nesta PRD.
- Alterar o framework utPLSQL no banco.

## 4. Requisitos

### RF1 — Evidência do formato

Coletar um Cobertura XML real (fixture de integração, PRD-13/15) e verificar a
presença de metadados de branch.

### RF2 — Protótipo condicional

Se o XML contiver branches, estender `parseCobertura` (`cobertura.ts`) para
extraí-los e `applyCoverageFromXml` para emitir `vscode.BranchCoverage`.

### RF3 — Registro de decisão

Se não houver dados de branch, registrar a limitação no README e encerrar a
investigação sem implementação (evitar Speculative Generality).

**Não-funcionais**
- RNF1 — Não quebrar o parse atual de linha/declaração.

## 5. Solução proposta

Spike: inspecionar `cobertura.ts` + uma fixture real; produzir um pequeno
relatório de viabilidade e, se viável, um PRD de implementação subsequente.

## 6. Configuração

Nenhuma.

## 7. Plano de testes

- **Investigação**: fixture real de cobertura → presença/ausência de branch.
- **Se viável**: unitário do parse de `BranchCoverage`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Framework não emite branch (provável) | Encerrar como "não viável", documentar, sem código morto. |
| Mudar de escopo para "melhorar cobertura de bloco" | Manter foco: só investigar branch. |

## 9. Rollout

- Sem release se não viável (apenas documentação).
- Se viável, nova PRD de implementação com versão alvo própria.

## 10. Critérios de aceite

- Relatório de viabilidade com evidência do Cobertura XML.
- Decisão registrada no README (se não viável) ou PRD filha (se viável).
- `npm test` continua passando (nenhuma regressão).

## 11. Questões em aberto

- O `ut_coverage_cobertura_reporter` emite `branch="true"`/`covered`?
  — Confirmar com a documentação upstream do utPLSQL.
- DBMS_PLSQL_CODE_COVERAGE expõe blocos (não branches) — alinhar expectativas.
