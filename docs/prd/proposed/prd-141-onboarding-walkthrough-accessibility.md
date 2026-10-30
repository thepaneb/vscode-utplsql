<!-- GENERATED FROM docs/brain/20-PRDs/prd-141-onboarding-walkthrough-accessibility.md — DO NOT EDIT -->

# PRD-141 — Walkthrough de onboarding e auditoria de acessibilidade

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.24.0 |
| Arquivos afetados | `package.json` (walkthroughs), `src/extension.ts`, `docs/brain/**` |
| Esforço estimado | 1–2 dias |
| Complexidade | Baixa-Média |
| Relaciona-se a | PRD-120 (ativação enxuta), PRD-119 (postura) |

## 1. Resumo

Adicionar um VS Code Walkthrough para onboarding (conexão, primeiro run,
cobertura) reusando comandos existentes, e auditar acessibilidade em QuickPicks
e notificações.

## 2. Contexto e problema

- Novos usuários enfrentam fricção na configuração inicial (conexão, grants).
- Setup diagnostics existe, mas não há guia passo a passo integrado.
- Acessibilidade (labels/aria) não foi auditada.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Declarar `contributes.walkthroughs` com passos que invocam comandos existentes.
- Auditar labels/aria em QuickPicks e notificações; corrigir lacunas.

**Não-objetivos**
- Criar comandos novos (reusar existentes).
- Mudar fluxo de execução.

## 4. Requisitos

### RF1 — Walkthrough

- Walkthrough com passos: configurar conexão, validar setup, rodar primeiro teste,
  ver cobertura.

### RF2 — Acessibilidade

- Garantir `placeHolder`/`title` em QuickPicks; notificações com texto claro.

**Não-funcionais**
- RNF1 — Sem impacto de ativação.

## 5. Solução proposta

- Adicionar seção `walkthroughs` ao `package.json`.
- Revisar pontos de `showQuickPick`/`showInformationMessage`.

## 6. Configuração

Nenhuma setting nova.

## 7. Plano de testes

- **Manual**: seguir walkthrough do zero.
- **Unitários**: n/a (UX).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Walkthrough desatualizado | Vincular a PRDs de features |

## 9. Rollout

- 0.24.0; registrar no CHANGELOG.

## 10. Critérios de aceite

- Walkthrough disponível e funcional.
- Acessibilidade auditada e corrigida.

## 11. Questões em aberto

- Incluir vídeo/GIF nos passos?

## 12. Impacto no cérebro

Ao concluir, atualizar wiki/README. Enquanto `proposed`, `regras: []`.

## Impacto nas docs

Superfícies: CHANGELOG, README, wiki.
