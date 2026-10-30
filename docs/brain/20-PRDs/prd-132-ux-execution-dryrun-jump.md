---
tipo: prd
id: PRD-132
aliases: [PRD-132]
status: proposed
titulo: "UX de execução: dry-run, perfil ativo e jump-to-failure"
versao: "0.23.0"
data: "2026-10-30"
autor: "Gil Cleber Barboza"
versao_titulo: "0.23.0 — Docs e qualidade residual"
verificado: "2026-10-30"
regras: []
docs: ["CHANGELOG", "wiki/Testing.md"]
tags: [prd]
---

# PRD-132 — UX de execução: dry-run, perfil ativo e jump-to-failure

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `src/commands/run.ts`, `src/statusBar.ts`, `src/results.ts`, `src/oracleRunner.ts`, `src/test/unit/results*.test.ts` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-27 (keybindings), PRD-29 (jump-to-failure), PRD-34 (perfis) |

## 1. Resumo

Melhorar a UX de execução com (a) **validação pré-execução (dry-run)** de
paths/tags/reporters antes de abrir conexões, (b) **indicador de perfil ativo** mais
visível na status bar, e (c) **expansão de `parseStackFrames`** para cobrir mais
formatos de stack Oracle/utPLSQL.

## 2. Contexto e problema

- Erros de config (paths inexistentes, reporter desconhecido, tag inválida) só
  aparecem após abrir conexões e rodar → feedback tardio.
- O perfil ativo é mostrado de forma discreta; trocar de ambiente sem perceber é
  risco operacional.
- `parseStackFrames` cobre `SCHEMA.PKG.PROC, line N` quoted/unquoted e filtra
  `UT_*`/`UT3_*`; stacks reais podem ter formatos adicionais.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Comando `utplsql.validateRun` (dry-run) que valida paths/tags/reporters e exibe
  problemas antes de rodar; não executa testes.
- Status bar mostra perfil ativo com cor/ícone distinto e tooltip com connection
  mascarada.
- Expandir `parseStackFrames` e `isUserFrame` com novos padrões e testes.

**Não-objetivos**
- Mudar o fluxo de run.
- Adicionar novas settings além das de exibição.
- Substituir jump-to-failure do VSCode.

## 4. Requisitos

### RF1 — Validação pré-execução
- `validateRun()` verifica: paths não vazios/válidos, tags parseáveis, reporters
  existentes no banco (best-effort), cobertura owner não vazio; retorna lista de
  problemas com severidade.

### RF2 — Comando dry-run
- `utplsql.validateRun` exibe problemas em QuickPick/Problems Panel; não executa
  testes.

### RF3 — Indicador de perfil ativo
- Status bar: quando um perfil estiver ativo, exibir nome do perfil com ícone e
  cor (warning quando não-default/PROD-like) e tooltip com connection mascarada.

### RF4 — Expansão de parseStackFrames
- Cobrir: `SCHEMA.PKG.PROC, line N`, variantes com coluna, chamadas aninhadas,
  `UT3.`/`UT3$`/`UT3_*`; `isUserFrame` filtra também `DBMS_*` e `SYS.*`.

### RF5 — Testes
- Testes de parse para cada novo formato e de `isUserFrame`.

**Não-funcionais**
- RNF1 — Sem regressão no jump-to-failure atual.
- RNF2 — Cobertura ≥ thresholds.

## 5. Solução proposta

- Adicionar `validateRun` em `src/runValidation.ts`; registrar comando.
- Ajustar `UtplsqlStatusBar` para exibir perfil.
- Expandir `parseStackFrames`/`isUserFrame` em `src/results.ts`.

## 6. Configuração

- `utplsql.statusBar.showActiveProfile` (boolean, default true)

## 7. Plano de testes

- **Unitários**: `runValidation.test.ts`; `results.test.ts` com novos formatos;
  `statusBar.test.ts` com perfil ativo.
- **Integração**: dry-run com banco real.
- **Manual**: trocar perfil e verificar status bar; executar teste falhando e
  verificar jump.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Dry-run dar falso positivo | Apenas validações estruturais + best-effort no banco; nunca bloquear run |
| Status bar poluída | Setting para desligar; tooltip para detalhes |
| Novos padrões de stack quebrar filtro | Testes de regressão para todos os formatos atuais + novos |

## 9. Rollout

- **0.23.0** ("Docs e qualidade residual"); `CHANGELOG.md`.
- Atualizar wiki `Testing.md`.

## 10. Critérios de aceite

- Dry-run funcional e não bloqueia run.
- Status bar exibe perfil ativo com tooltip mascarado.
- Jump-to-failure cobre novos formatos.
- Cobertura ≥ thresholds; suíte verde.

## 11. Questões em aberto

- Dry-run deve ser automático antes de cada run (opt-in) ou apenas comando?
- Quais padrões de stack adicionais aparecem em stacks reais?

## 12. Impacto no cérebro

Criar regra `BR-UX-*` ("validação pré-execução e jump-to-failure cobrem os formatos
reais de stack") com `prds: ["PRD-132"]`, `implementacao:` e `testes:`. Enquanto
`proposed`, `regras: []`.

## Impacto nas docs

`CHANGELOG` e `wiki/Testing.md`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-27-default-keybindings|PRD-27]] · [[prd-29-jump-to-failing-assertion|PRD-29]] · [[prd-34-multi-connection-profiles|PRD-34]]
- 🔗 Mesma versão (0.23.0): [[prd-97-doc-no-site|PRD-97]] · [[prd-99-brain-reuse|PRD-99]] · [[prd-112-error-handling-audit|PRD-112]] · [[prd-116-direct-module-tests|PRD-116]] · [[prd-117-split-script-property-tests|PRD-117]] · [[prd-121-auditable-package-sourcemap|PRD-121]] · [[prd-122-marketplace-trust-metadata|PRD-122]] · [[prd-126-branch-coverage-cli-tests|PRD-126]] · [[prd-133-rate-limiting-keybindings|PRD-133]]
- 🚀 ⬅️ release anterior: [[prd-93-continuous-localization-pipeline|PRD-93 (0.22.0)]]
<!-- brain:auto:end -->
