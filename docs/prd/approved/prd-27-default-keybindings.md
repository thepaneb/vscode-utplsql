# PRD-27 — Default Keybindings

| Campo | Valor |
|---|---|
| Status | Aprovado |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.8.0 |
| Arquivos afetados | `package.json` |

## 1. Resumo

Adicionar atalhos de teclado padrão para os comandos já registrados da extensão.
Atualmente todos os 10 comandos existem mas exigem o uso do Command Palette ou
menu de contexto. Extensões como Jest/Vitest Runner, Python, Go e dbFlux
fornecem keybindings padrão — sua ausência é uma barreira de produtividade
para usuários frequentes.

## 2. Contexto e problema

O vscode-utplsql registra 10 comandos em `package.json` (`utplsql.runAll`,
`utplsql.runFile`, `utplsql.runFileCoverage`, `utplsql.refresh`, etc.), mas
nenhum tem `keybindings` associados. O usuário precisa:

1. `Ctrl+Shift+P` → digitar "utPLSQL" → selecionar comando
2. Ou: botão direito no arquivo → submenu utPLSQL
3. Ou: Test Explorer → clicar no ícone ▶

Extensões concorrentes resolvem isso:
- **dbFlux**: `Ctrl+Alt+T` (run tests), `Shift+Alt+B` (compile selected)
- **Jest/Vitest Runner**: `Alt+1` (run), `Alt+2` (debug)
- **Test Explorer UI**: atalhos configuráveis pelo usuário

## 3. Objetivos / Não-objetivos

**Objetivos**
- Definir keybindings padrão para comandos de alta frequência
- Usar combinações de teclas não conflitantes com extensões populares
- Contexto condicional (`when` clauses) para comandos específicos de arquivo
- Keybindings padrão removíveis pelo usuário (sobrescrever no `keybindings.json`)

**Não-objetivos**
- Keybindings para comandos inexistentes (serão adicionados quando os comandos
  forem criados em PRDs futuros)
- Interface de configuração visual de atalhos (VSCode já oferece nativamente)
- Suporte a chord keys (sequências de duas teclas) — manter simples

## 4. Requisitos

### RF1 — Keybindings globais (sempre disponíveis)

| Comando | Atalho proposto | Justificativa |
|---|---|---|
| `utplsql.runAll` | `Ctrl+Shift+U R` | "utPLSQL Run All" — mnemônico, combinação livre |
| `utplsql.refresh` | `Ctrl+Shift+U F` | "utPLSQL reFresh" — mnemônico |
| `utplsql.cancelRun` | `Escape` (durante execução) | Padrão para cancelar; `when` condicional |
| `utplsql.showInfo` | `Ctrl+Shift+U I` | "utPLSQL Info" |
| `utplsql.clearConnection` | `Ctrl+Shift+U C` | "utPLSQL Clear" |

### RF2 — Keybindings contextuais (arquivo `.pks`/`.pkb` aberto)

| Comando | Atalho proposto | When clause |
|---|---|---|
| `utplsql.runFile` | `Ctrl+Shift+U T` | `resourceExtname == .pks \|\| resourceExtname == .pkb` |
| `utplsql.runFileCoverage` | `Ctrl+Shift+U Shift+T` | `resourceExtname == .pks \|\| resourceExtname == .pkb` |
| `utplsql.runFolder` | `Ctrl+Shift+U D` | `explorerResourceIsFolder` |
| `utplsql.runFolderCoverage` | `Ctrl+Shift+U Shift+D` | `explorerResourceIsFolder` |

### RF3 — Implementação em `package.json`

```json
{
  "contributes": {
    "keybindings": [
      {
        "command": "utplsql.runAll",
        "key": "ctrl+shift+u r",
        "mac": "cmd+shift+u r",
        "when": "utplsql:connected"
      },
      {
        "command": "utplsql.runFile",
        "key": "ctrl+shift+u t",
        "mac": "cmd+shift+u t",
        "when": "editorTextFocus && resourceExtname =~ /\\.pks|\\.pkb/ && utplsql:connected"
      },
      {
        "command": "utplsql.runFileCoverage",
        "key": "ctrl+shift+u shift+t",
        "mac": "cmd+shift+u shift+t",
        "when": "editorTextFocus && resourceExtname =~ /\\.pks|\\.pkb/ && utplsql:connected"
      },
      {
        "command": "utplsql.refresh",
        "key": "ctrl+shift+u f",
        "mac": "cmd+shift+u f",
        "when": "utplsql:activated"
      },
      {
        "command": "utplsql.showInfo",
        "key": "ctrl+shift+u i",
        "mac": "cmd+shift+u i",
        "when": "utplsql:activated"
      },
      {
        "command": "utplsql.clearConnection",
        "key": "ctrl+shift+u c",
        "mac": "cmd+shift+u c",
        "when": "utplsql:activated"
      },
      {
        "command": "utplsql.cancelRun",
        "key": "escape",
        "when": "utplsql:running"
      }
    ]
  }
}
```

### RF4 — Context keys para `when` clauses

Registrar context keys via `vscode.commands.executeCommand('setContext', ...)`:

```typescript
// extension.ts — activate()
vscode.commands.executeCommand('setContext', 'utplsql:activated', true);

// runner.ts — durante execução
vscode.commands.executeCommand('setContext', 'utplsql:running', true);
// runner.ts — após execução
vscode.commands.executeCommand('setContext', 'utplsql:running', false);

// config.ts — ao resolver conexão
vscode.commands.executeCommand('setContext', 'utplsql:connected', true);
// config.ts — ao limpar conexão
vscode.commands.executeCommand('setContext', 'utplsql:connected', false);
```

**Não-funcionais**
- RNF1 — Keybindings não devem conflitar com atalhos padrão do VSCode ou
  extensões populares (GitLens, ESLint, Prettier). `Ctrl+Shift+U` é pouco usado.
- RNF2 — Prefixo `Ctrl+Shift+U` agrupa todos os comandos utPLSQL sob um
  namespace visual no teclado.
- RNF3 — Documentar atalhos no README e no tooltip dos comandos no Command Palette.

## 5. Solução proposta

### 5.1 Prefixo `Ctrl+Shift+U`

O prefixo `Ctrl+Shift+U` não é usado por extensões populares:
- `Ctrl+Shift+P` = Command Palette
- `Ctrl+Shift+O` = Go to Symbol
- `Ctrl+Shift+M` = Problems
- `Ctrl+Shift+U` = Output (mas só quando focado no Output panel — não conflita)

A segunda tecla segue mnemônicos:
- **R** = Run All
- **T** = Test (run file)
- **F** = reFresh
- **I** = Info
- **C** = Clear connection
- **D** = Directory (run folder)

### 5.2 `package.json`

Adicionar seção `contributes.keybindings` com os 7 keybindings listados.
Cada keybinding inclui `mac` equivalente (`cmd+shift+u`).

### 5.3 README.md

Adicionar tabela de atalhos na seção "Comandos" (ou seção própria "Keybindings").

## 6. Configuração

Nenhuma nova setting. Keybindings são nativamente customizáveis pelo usuário
via `File > Preferences > Keyboard Shortcuts`.

## 7. Plano de testes

- **Unitários**:
  - Validar que `package.json` tem `contributes.keybindings` com os 7 atalhos
  - Validar `when` clauses sintaticamente corretas
  - Validar que `mac` existe para cada atalho
- **Integração/Manual**:
  - `Ctrl+Shift+U R` → executa todos os testes
  - `Ctrl+Shift+U T` com `.pks` aberto → executa testes do arquivo
  - `Ctrl+Shift+U F` → força refresh da descoberta
  - `Escape` durante execução → cancela
  - Verificar que atalhos NÃO funcionam com extensão desativada
  - Verificar que `Ctrl+Shift+U T` NÃO funciona em `.sql` (when clause)

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Conflito com keybindings do usuário ou outras extensões | VSCode mostra aviso de conflito no Keyboard Shortcuts editor; usuário pode redefinir |
| `Ctrl+Shift+U` já usado para `View: Show Output` | Só dispara quando painel Output está focado; `when` clause previne conflito |
| Usuários Mac com teclado diferente | Incluir `mac` em todos os atalhos |
| Chord keys (`Ctrl+Shift+U` seguido de `R`) não funcionam em todos OS | Testar no Windows, Mac e Linux |

## 9. Rollout

- Release 0.8.0 (minor)
- Keybindings são ativados automaticamente ao carregar a extensão
- CHANGELOG: "Keybindings: atalhos de teclado padrão para comandos utPLSQL (prefixo Ctrl+Shift+U)"
- Publicar via release no GitHub

## 10. Critérios de aceite

- `npm test` passa
- `package.json` contém 7 keybindings com `when` clauses
- `Ctrl+Shift+U R` executa todos os testes
- `Ctrl+Shift+U T` com `.pks` aberto executa testes do arquivo
- `Escape` cancela execução em andamento
- Atalhos não disparam com extensão desativada
- Atalhos documentados no README

## 11. Questões em aberto

- Alternativa: usar `Ctrl+;` como prefixo (tecla de ponto-e-vírgula, comum em
  PL/SQL)? Menos intuitivo, mas garante zero conflito.
- Adicionar atalhos para PRD-31 (rerun last, run at cursor) quando criados?
  — Sim, PRD-31 deve definir seus próprios keybindings.
- O prefixo `Ctrl+Shift+U` já é usado pelo VSCode para `undo` em alguns
  contextos? `Ctrl+U` é `undo`, mas `Ctrl+Shift+U` é livre.
