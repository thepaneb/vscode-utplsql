# Screenshots da Wiki — Guia de Captura Manual

Coloque os PNGs capturados neste diretório.

## Especificações gerais

- Resolução máxima: **1200px** de largura
- Formato: **PNG**
- Tema do VSCode: **claro padrão** (`Default Light+`) para legibilidade no GitHub Wiki
- Recorte apenas a área relevante (não a tela inteira)
- Use `Win+Shift+S` (Windows), `Cmd+Shift+4` (macOS), `flameshot` (Linux)

## Pré-requisitos

Antes de capturar, configure o ambiente:

1. Abra o VSCode no workspace fixture:
   ```
   code src/test/fixtures/workspace-gen-screenshots/
   ```
2. Configure a conexão Oracle:
   ```jsonc
   // .vscode/settings.json
   {
     "utplsql.connection": "user/pass@//host:1521/service",
     "utplsql.organization": "schema",
     "utplsql.organization.schemaPattern": "db/{schema}/**",
     "workbench.colorTheme": "Default Light+"
   }
   ```
3. Execute os testes uma vez (`Ctrl+Shift+U` → `R`) para popular resultados e cobertura

---

## Checklist de captura

Marque cada item ao capturar. Os nomes de arquivo devem ser **exatamente** os listados.

### UI pura (15 prints)

| # | Arquivo | Onde na wiki | Como capturar |
|---|---|---|---|
| 1 | `test-explorer-suites.png` | Home.md | Test Explorer com suites expandidas mostrando `tst_hello_world`, `tst_coverage_sample`, `tst_multi_suite` |
| 2 | `sidebar-testing-icon.png` | Quick-start.md | Ícone do Testing na barra lateral (frasco/beaker) |
| 3 | `test-explorer-hello-world.png` | Quick-start.md | Resultado de execução: indicadores ✓ verdes nos testes |
| 4 | `test-explorer-pass-fail.png` | Quick-start.md | Test Explorer após execução com tooltip de falha visível (hover sobre ✗) |
| 5 | `context-menu-pks.png` | Quick-start.md | Menu de contexto sobre arquivo `.pks` no Explorer mostrando comandos utPLSQL |
| 6 | `context-menu-folder.png` | Commands.md | Menu de contexto sobre pasta no Explorer |
| 7 | `palette-commands.png` | Commands.md | Command Palette (`F1`) filtrando "utplsql" — mostrar a lista de comandos |
| 8 | `palette-clear-connection.png` | Connection.md | Command Palette com "utplsql clear" selecionado |
| 9 | `keyboard-shortcuts.png` | Commands.md | Painel de Keyboard Shortcuts (`Ctrl+K Ctrl+S`) |
| 10 | `marketplace-card.png` | Installation-and-requirements.md | Card da extensão no marketplace do VSCode |
| 11 | `install-from-vsix.png` | Installation-and-requirements.md | Menu "Install from VSIX..." no Command Palette |
| 12 | `dev-host-testing.png` | Contributing.md | Janela do Extension Development Host (`F5`) |
| 13 | `schema-mode-tree.png` | Tree-organization.md | Test Explorer em modo schema mostrando `Schema: APP` e `Schema: INVENTORY` |
| 14 | `quickpick-reporters.png` | Reporters.md | QuickPick de seleção de reporter adicional |
| 15 | `annotations-display.png` | Quick-start.md | Editor com `tst_annotations.pks` aberto + Test Explorer mostrando `Hello customizado` (`%displayname`) e **sem** o teste `%disabled` |

### Com banco Oracle (4 prints)

| # | Arquivo | Onde na wiki | Como capturar |
|---|---|---|---|
| 17 | `output-terminal.png` | Quick-start.md | Output panel após execução mostrando documentation reporter |
| 18 | `editor-coverage-gutters.png` | Coverage.md | Editor com `tst_coverage_sample.pks` mostrando gutters de cobertura (verde=coberto, vermelho=não coberto) |
| 19 | `coverage-panel.png` | Coverage.md | Painel Test Coverage com percentuais por arquivo |
| 20 | `sqlcl-compile.png` | Quick-start.md | Output de compilação SQLcl com packages compilados |

### Diagramas (5 arquivos, gerados via SVG)

| # | Arquivo | Onde é usado | Como gerar |
|---|---|---|---|
| 21 | `diagram-schemas.png` | Database-requirements.md | `npm run gen-diagram` (renderiza o SVG) |
| 22 | `diagram-arquitetura.png` | Architecture.md | `npm run gen-diagram` |
| 23 | `diagram-conexao.png` | Connection.md | `npm run gen-diagram` |
| 24 | `diagram-streaming.png` | Oracle-direct-execution.md | `npm run gen-diagram` |
| 25 | `diagram-diagnosticos.png` | Diagnostics-and-quick-fix.md | `npm run gen-diagram` |

Os diagramas são mantidos como **SVG** (fonte da verdade, versionável) e
renderizados para **PNG de 1200px** pelo script `scripts/gen-diagrams.cjs`
(`@resvg/resvg-js`, cross-platform). Ao editar um SVG, rode `npm run
gen-diagram` e commite os dois formatos.

---

## Dicas de captura

- **Gutters de cobertura**: execute `utplsql: Run All Tests (with Coverage)` para ter os indicadores coloridos
- **Tooltip de falha**: faça hover sobre o ✗ no Test Explorer por 1-2s antes de capturar
- **Command Palette**: digite parte do comando e capture com o filtro aplicado
- **Nomes de arquivo**: respeite exatamente os nomes da checklist — a wiki referencia por nome
