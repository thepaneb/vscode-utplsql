<!-- GENERATED FROM docs/brain/20-PRDs/prd-140-statusbar-settings-grouping.md — DO NOT EDIT -->

# PRD-140 — Indicador de conexão/perfil no status bar e agrupamento de settings

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.24.0 |
| Arquivos afetados | `src/statusBar.ts`, `package.json`, `src/test/unit/statusBar.test.ts` |
| Esforço estimado | 1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-65 (perfis), PRD-81 (hardening) |

## 1. Resumo

Exibir o perfil ativo (ou conexão mascarada) no status bar, e agrupar as 60+
settings em sub-grupos com `title` no `contributes.configuration`, melhorando
discoverability.

## 2. Contexto e problema

- O status bar mostra apenas estado de execução; em multi-ambiente o usuário não
  sabe qual conexão está ativa.
- As settings são uma lista plana longa, dificultando descoberta.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Status bar exibe `$(database) <nome do perfil ou conexão mascarada>`.
- Atualizar ao trocar perfil/conexão.
- Agrupar settings em: Conexão, Cobertura, Execução, Debug, Interface, Geração.

**Não-objetivos**
- Mudar valores default.
- Novas settings.

## 4. Requisitos

### RF1 — Status bar informativo

- Exibir perfil ativo ou `maskConnection(connection)` quando não houver perfil.
- Atualizar em `setActiveProfile`/`clearSessionConnection`.

### RF2 — Agrupamento

- Usar `order` e grupos no `configuration` do `package.json`.

**Não-funcionais**
- RNF1 — Sem impacto de performance.

## 5. Solução proposta

- Estender `UtplsqlStatusBar` com método `setConnectionLabel`.
- Reorganizar `package.json` configuration.

## 6. Configuração

Nenhuma setting nova.

## 7. Plano de testes

- **Unitários**: status bar exibe label; atualiza ao trocar perfil.
- **Manual**: trocar perfil e observar status bar.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Poluição visual | Truncar label longo |

## 9. Rollout

- 0.24.0; registrar no CHANGELOG.

## 10. Critérios de aceite

- Status bar mostra conexão/perfil ativo.
- Settings agrupadas no Marketplace/VS Code.

## 11. Questões em aberto

- Exibir também versão do utPLSQL?

## 12. Impacto no cérebro

Ao concluir, atualizar wiki/README (settings). Enquanto `proposed`, `regras: []`.

## Impacto nas docs

Superfícies: CHANGELOG, README (gerado).
