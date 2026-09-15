# PRD-54 — Toggle de cobertura na status bar

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.14.0 |
| Arquivos afetados | `src/statusBar.ts`, `src/state.ts`, `src/extension.ts`, `package.json` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa-Média |

## 1. Resumo

Permitir alternar um modo global de cobertura ("sempre com cobertura") a partir
da status bar, aplicando-o aos entry points `runAll`/`runFile`/`runAtCursor`/
`rerunLast`. Jest ("Toggle Coverage") e Go fazem o mesmo. Hoje cobertura só é
acessível via perfil separado ou comando dedicado.

## 2. Contexto e problema

Cada execução exige escolher explicitamente o perfil "Run" vs. "Run with
Coverage". Em ciclos de desenvolvimento com cobertura sempre ligada, isso é
atrito. A status bar (`statusBar.ts`) já tem um item, mas ele está preso a
`utplsql.switchProfile`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Flag de sessão `state.coverageAlways: boolean` (default `false`).
- Comando `utplsql.toggleCoverage` que inverte a flag e atualiza o ícone.
- Entry points sem coverage explícito passam a usar a flag.
- Novo item de status bar (lado direito) ou item de menu de contexto no item
  existente.

**Não-objetivos**
- Persistir a flag entre sessões (follow-up: setting `utplsql.defaultCoverage`).
- Mudar a semântica dos comandos `*Coverage` (que continuam forçando coverage).

## 4. Requisitos

### RF1 — Flag no estado

```typescript
// state.ts
coverageAlways = false;
setCoverageAlways(v: boolean): void;
```

### RF2 — Toggle e ícone

```typescript
// statusBar.ts
this.coverageItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
this.coverageItem.command = 'utplsql.toggleCoverage';
this.coverageItem.text = '$(beaker) Coverage: off'; // ou '$(beaker) $(check) Coverage: on'
```

### RF3 — Entry points honram a flag

Em `runAll`/`runFile`/`runAtCursor`/`rerunLast`/`runByTag` (PRD-51), o
parâmetro `coverage` passa a ser `explicitCoverage ?? state.coverageAlways`.
Comandos `*Coverage` seguem forçando `true`.

### RF4 — Sincronia com auto-run

A PRD-50 (auto-run on save) usa a mesma flag para decidir se roda com
cobertura.

**Não-funcionais**
- RNF1 — Toggle não persiste (sessão); avisar via tooltip.
- RNF2 — Toggle deve refletir também quando a cobertura for pulada por falta
  do reporter (runner já avisa hoje).

## 5. Solução proposta

Adicionar o item à `UtplsqlStatusBar`, o comando em `extension.ts` e a flag em
`TestStateManager`. Ajustar os entry points para centralizar a decisão
`coverage = explicit ?? state.coverageAlways`.

## 6. Configuração

- Comando `utPLSQL: Alternar cobertura`.
- Nenhuma setting nova nesta PRD (flag de sessão).

## 7. Plano de testes

- **Unitários**: lógica de resolução `explicit ?? always` (função pura).
- **Integração**: toggle liga → `runAll` coleta cobertura; comando `runAll`
  continua sem cobertura quando toggle desligado; `runFileCoverage` força
  cobertura mesmo com toggle off.
- **Manual**: ícone da status bar reflete o estado.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Confusão entre toggle global e comandos `*Coverage` | Comandos `*Coverage` seguem explícitos; documentar no README. |
| Usuário esquece que cobertura está ligada (custo de BD) | Ícone visível + tooltip; não persistir por padrão. |

## 9. Rollout

- Release 0.14.0 (minor).
- CHANGELOG: "Toggle de cobertura na status bar".

## 10. Critérios de aceite

- `npm test` passa.
- Toggle alterna ícone e comportamento de `runAll`/`runFile`/`runAtCursor`.
- Comandos `*Coverage` não são afetados.
- Integrado ao auto-run (PRD-50).

## 11. Questões em aberto

- Persistir em `utplsql.defaultCoverage`? — Follow-up.
- Toggle deveria virar um perfil `TestRunProfile` nativo de "coverage default"?
  — Avaliar.
