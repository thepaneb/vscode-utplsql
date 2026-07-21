# PRD-23 — Automatizar geração de screenshots da wiki

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` + CI/CD + `docs/wiki/images/` |
| Versão alvo | 0.8.0 |
| Arquivos afetados | `scripts/gen-screenshots.cjs`, `src/test/fixtures/workspace-gen-screenshots/`, `docs/wiki/images/`, `package.json` |

## 1. Resumo

A wiki da extensão requer screenshots da UI do VSCode para documentar fluxos
(Test Explorer, comandos, cobertura, instalação). O spec define 21 screenshots
— apenas 6 existem, todos capturados manualmente. Recapturá-los a cada release
que altera a UI é inviável. Esta PRD propõe um script que lança o VSCode
Extension Development Host com fixtures predefinidas e captura screenshots via
Playwright, gerando PNGs prontos para `docs/wiki/images/`.

## 2. Contexto e problema

`docs/wiki/images/README.md` especifica 21 screenshots com instruções de captura
manual (Win+Shift+S, flameshot, etc.). O processo atual é:

1. Abrir VSCode manualmente com a extensão carregada
2. Configurar workspace com exemplos de PL/SQL
3. Executar comandos, posicionar cursores, abrir painéis
4. Capturar com ferramenta de snipping
5. Recortar, nomear e salvar em `docs/wiki/images/`

Isso é repetitivo, propenso a inconsistências (temas, resoluções, área de
recorte) e consome ~2-3h por rodada. Para 15 screenshots faltantes, o custo
inicial já é alto. Para futuras releases, recapturar todos é proibitivo.

A extensão já possui `@vscode/test-electron` (devDependency) que permite lançar
uma instância do VSCode programaticamente. O que falta é a camada de captura de
tela (Playwright) e fixtures.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Script `npm run gen-screenshots` que gera screenshots automaticamente
- Fixtures: workspace com `.pks` de exemplo + `.vscode/settings.json`
- Automatizar 16 dos 21 screenshots (UI pura + com dados estáticos)
- Documentar os 5 screenshots restantes como manuais com instruções claras
- Saída em `docs/wiki/images/` com nomes conformes ao spec

**Não-objetivos**
- Substituir `npm run gen-icon` (escopo separado, ícone do marketplace)
- Automatizar screenshots que exigem banco Oracle real (output de terminal,
  resultados de teste com dados reais)
- Gerar o diagrama arquitetural `diagram-schemas.png` (seguirá manual,
  Excalidraw/draw.io)
- Capturar vídeos ou GIFs animados
- Testar a extensão com múltiplas versões do VSCode

## 4. Requisitos

### RF1 — Script gerador `scripts/gen-screenshots.cjs`

Script Node.js que:
1. Lança VSCode Extension Development Host via `@vscode/test-electron`,
   apontando para uma fixture workspace
2. Conecta Playwright à janela Electron do VSCode
3. Executa comandos da extensão (`workbench.action.` nativos e comandos
   `utplsql.*`) para atingir cada estado da UI
4. Captura viewports ou elementos específicos como PNG
5. Recorta e salva em `docs/wiki/images/` com nomes definidos pelo spec

### RF2 — Fixtures de workspace

Criar `src/test/fixtures/workspace-gen-screenshots/` com:
- `tst_hello_world.pks` — suite simples com um teste que passa (para capturas
  do Test Explorer)
- `tst_complex.pks` — múltiplos suites e testes com anotações `%test` (para
  capturas de cobertura, gutters, painel de resultados)
- `.vscode/settings.json` — light theme, configurações utplsql mínimas

### RF3 — Cobertura de screenshots automatizados

Os 16 screenshots a automatizar, agrupados por dependência:

**UI pura (11 screenshots):**
- `test-explorer-pass-fail.png` — indicadores pass/fail com tooltip
- `palette-clear-connection.png` — comando de limpeza de conexão
- `keyboard-shortcuts.png` — UI de atalhos de teclado
- `marketplace-card.png` — card da extensão no marketplace
- `install-from-vsix.png` — menu de instalação via VSIX
- `editor-coverage-gutters.png` — gutters verdes/vermelhos no editor
- `coverage-panel.png` — painel Test Coverage com percentuais
- `dev-host-testing.png` — janela Extension Development Host
- `quickpick-reporters.png` — seleção de reporter via QuickPick

**Com banco mockado/dados estáticos (5 screenshots):**
- `output-terminal.png` — output do documentation reporter
- `output-coverage-mapping.png` — log de mapeamento de cobertura
- `output-cli-args.png` — comparação de argumentos CLI (launcher vs java)
- `sqlcl-compile.png` — output de compilação SQLcl
- `sqlcl-version.png` — output de consulta de versão utPLSQL

Para os 5 com banco, usar mocks de stdout com dados estáticos pré-capturados
(evitando dependência de Oracle real no CI).

### RF4 — Screenshots mantidos manuais

Os 5 screenshots restantes exigem contexto que não é prático automatizar:

- `test-explorer-suites.png` — já existe (capturado manualmente, pode ser
  recapturado se a UI mudar)
- `sidebar-testing-icon.png` — já existe (ícone na sidebar)
- `test-explorer-hello-world.png` — já existe (resultado real de execução)
- `context-menu-pks.png` — já existe (menu de contexto)
- `context-menu-folder.png` — já existe (menu de contexto de pasta)
- `palette-commands.png` — já existe (paleta de comandos)
- `diagram-schemas.png` — diagrama arquitetural (Excalidraw, sempre manual)

> Nota: os 6 existentes podem ser migrados para o script gerador se a
> implementação mostrar que são capturáveis automaticamente com qualidade
> equivalente.

### RF5 — Script npm

Adicionar em `package.json`:
```json
"gen-screenshots": "node scripts/gen-screenshots.cjs"
```

### RF6 — Integração com CI

Dois modos possíveis (a decidir na implementação):
- **Opção A**: workflow separado `gen-screenshots.yml` com `workflow_dispatch`
  (execução manual quando necessário)
- **Opção B**: step opcional no `wiki.yml` que detecta mudanças na UI e
  regenera screenshots automaticamente

**Não-funcionais**
- Executável em Linux headless (CI) com `xvfb-run`
- Idempotente (rodar duas vezes gera os mesmos PNGs)
- Tempo total < 5 minutos para todas as capturas
- PNGs com largura ≤ 1200px (conforme spec)
- Light theme (conforme spec)
- Playwright como devDependency

## 5. Solução proposta

### 5.1 Fixtures de workspace

```
src/test/fixtures/workspace-gen-screenshots/
├── .vscode/
│   └── settings.json          # "workbench.colorTheme": "Default Light+",
│                              # "utplsql.cliPath": "/fake/path",
│                              # "utplsql.connection": ""
├── tst_hello_world.pks        # Suite "Hello World" com 1 teste
├── tst_coverage_sample.pks    # Suite com %test anotações para cobertura
└── tst_multi_suite.pks        # Múltiplos suites/tests para Explorer
```

### 5.2 Script gerador (`scripts/gen-screenshots.cjs`)

Fluxo principal:

```javascript
const { runVSCode } = require('@vscode/test-electron');
const { chromium } = require('playwright');

async function main() {
  // 1. Launch VSCode
  const vscode = await runVSCode({
    extensionDevelopmentPath: __dirname + '/..',
    extensionTestsPath: undefined, // não rodamos testes, só queremos a UI
    launchArgs: ['workspace-gen-screenshots/'],
  });

  // 2. Connect Playwright via Electron debug protocol
  const browser = await chromium.connectOverCDP(
    `http://localhost:${debugPort}`
  );
  const page = browser.contexts()[0].pages()[0];

  // 3. Capture each screenshot
  await captureTestExplorer(page);
  await captureCommandPalette(page);
  await captureCoverageGutters(page);
  // ...

  await browser.close();
  await vscode.kill();
}
```

### 5.3 Estratégia de seletores

Usar seletores estáveis da API do VSCode em vez de classes CSS internas:

| Alvo | Seletor |
|---|---|
| Test Explorer view | `[aria-label="Test Explorer"]` |
| Command Palette | `.quick-input-widget` (aberta via `workbench.action.showCommands`) |
| Editor area | `.editor-instance` |
| Coverage panel | `[aria-label="Test Coverage"]` |
| Context menu | Capturar após `executeCommand` que abre menu |

### 5.4 Mocks de output de terminal

Para os 5 screenshots que mostram output do CLI, criar arquivos de texto
estáticos em `src/test/fixtures/sample-output/`:

- `documentation-reporter.txt` — saída típica do `-f=ut_documentation_reporter`
- `coverage-mapping.txt` — log de mapeamento `-source_path`
- `cli-args-launcher.txt` / `cli-args-java.txt` — argumentos montados
- `sqlcl-compile.txt` — output de compilação
- `sqlcl-version.txt` — output de `utplsql info`

O script abre o OutputChannel, injeta o texto mockado e captura o painel.

## 6. Configuração

- Nova devDependency: `playwright` (>= 1.50)
- Post-install: `npx playwright install chromium` (apenas Chromium, não precisa
  de WebKit/Firefox)
- Nenhuma nova setting de usuário
- Nenhum novo comando da extensão

## 7. Plano de testes

- **Unitários**: testar funções de recorte/redimensionamento de PNG (sem
  dependência de VSCode/Playwright).
- **Integração**: rodar `npm run gen-screenshots` em CI Linux headless e validar
  que ≥ 16 PNGs são gerados com dimensões ≤ 1200px de largura. Validar que o
  script é idempotente.
- **Validação manual**: inspecionar visualmente os screenshots gerados e
  comparar com o spec em `docs/wiki/images/README.md`. Verificar que nomes de
  arquivo, recorte e tema estão corretos.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Seletors Playwright quebram com updates do VSCode | Usar `aria-label` e `role` em vez de classes CSS internas; revisar a cada release |
| CI precisa de display virtual para VSCode Electron | Usar `xvfb-run` no workflow (já é padrão em `ubuntu-latest`) |
| Playwright + Electron pode quebrar com versões novas do VSCode | Pin `@vscode/test-electron` e `playwright`; testar no CI antes do release |
| Screenshots de terminal variam com versão do Oracle/CLI | Usar mocks de stdout com dados estáticos; screenshots de output real permanecem manuais |
| `runVSCode` não expõe porta de debug por padrão | Verificar compatibilidade; fallback: usar `--remote-debugging-port` via launch args do Electron |
| Tempo de CI aumenta com download do Chromium | Cache do Playwright no CI (ação `actions/cache` ou `setup-playwright`) |

## 9. Rollout

- Release `0.8.0` (minor — nova funcionalidade de dev tooling)
- Deploy:
  1. `npm install` (nova devDep `playwright`)
  2. `npx playwright install chromium`
  3. `npm run gen-screenshots`
  4. Commit dos PNGs gerados em `docs/wiki/images/`
- CHANGELOG:
  - `Added: npm run gen-screenshots for automated wiki screenshot generation`
  - `Added: workspace fixtures for screenshot generation`

## 10. Critérios de aceite

- `npm run gen-screenshots` gera ≥ 16 PNGs em `docs/wiki/images/`
- Todos os PNGs têm largura ≤ 1200px e seguem o spec (`README.md`)
- Nomes de arquivo correspondem exatamente aos listados no spec
- Script não falha em ambiente headless Linux (CI)
- `npm run gen-screenshots` é idempotente (segunda execução gera PNGs idênticos)
- Screenshots manuais restantes têm instruções claras no próprio spec
- `playwright` não é incluído no `.vsix` (é devDependency, não dependency)

## 11. Questões em aberto

- [ ] **Mock vs manual**: os 5 screenshots de terminal ficam melhores mockados
  (dados estáticos previsíveis) ou mantidos manuais (output real mais autêntico)?
- [ ] **Workflow CI**: `gen-screenshots` deve ser workflow separado
  (`workflow_dispatch`) ou integrado ao `wiki.yml`?
- [ ] **Frequência**: screenshots devem ser regenerados a cada release (automático)
  ou sob demanda (manual)?
- [ ] **VSCode version**: as fixtures precisam de VSCode estável ou insiders?
  A versão usada no CI pode divergir da versão que o usuário vê no marketplace.
- [ ] **Electron CDP port**: `@vscode/test-electron` expõe a porta de debug
  automaticamente ou precisa de configuração adicional? Testar viabilidade antes
  de investir no script completo.
