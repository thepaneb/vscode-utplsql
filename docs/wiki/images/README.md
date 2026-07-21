# Screenshots da Wiki

Coloque os PNGs capturados neste diretório.

## Especificações gerais

- Resolução máxima: **1200px** de largura
- Formato: **PNG**
- Tema do VSCode: **claro padrão** para legibilidade no GitHub Wiki
- Recorte apenas a área relevante (não a tela inteira)
- Use a ferramenta de snipping do sistema (Win+Shift+S, Screenshot.app, flameshot etc.)

---

## Sem banco (UI pura — 17 prints)

### `test-explorer-suites.png`
**Onde:** Home.md  
**O que mostrar:**
- View Testing aberta na barra lateral esquerda
- Múltiplas suites listadas (ex: "Hello World", "Matemática", "Funcionários")
- Cada suite **expandida** mostrando seus testes internos (ícone ▶ de colapso visível)
- Nomes reais de suites e testes (não "suite1", "test1")
- **NÃO** mostrar código no editor — feche os editores ou minimize-os
- Tamanho: ~400px largura × ~500px altura

**Como capturar:**
1. Tenha um projeto com 3+ suites nos `.pks`
2. Abra a Testing view
3. Expanda todas as suites clicando no ▶ de cada uma
4. Recorte só o painel Testing

---

### `sidebar-testing-icon.png`
**Onde:** Guia-rápido.md, passo 3  
**O que mostrar:**
- Barra lateral esquerda do VSCode (Activity Bar) inteira
- Ícone do **Testing** (frasco/Erlenmeyer) com uma seta/indicador visual apontando para ele
- Outros ícones visíveis (Explorer, Search, Source Control, Debug, Extensions) como contexto

**Como capturar:**
1. Posicione o mouse sobre o ícone Testing (isso destaca com tooltip)
2. Recorte a Activity Bar vertical esquerda (~50px × 400px) ou capture com uma seta sobreposta

---

### `test-explorer-hello-world.png`
**Onde:** Guia-rápido.md, passo 3  
**O que mostrar:**
- View Testing com **apenas uma suite** ("Hello World")
- Suite expandida mostrando um teste: "Saudação retorna Hello"
- Ícone de ▶ (play) visível ao lado do nome do teste (gutter run button)
- Árvore limpa, sem outras suites

**Como capturar:**
1. Tenha só o `test_hello.pks` compilado
2. Abra a Testing view, expanda a suite "Hello World"
3. Recorte só o painel Testing

---

### `test-explorer-pass-fail.png`
**Onde:** Guia-rápido.md, passo 5  
**O que mostrar:**
- View Testing com ao menos 2 suites após execução
- **Um teste verde** ✅ (passou) à esquerda do nome do teste
- **Um teste vermelho** ❌ (falhou) com **tooltip de erro visível** (passe o mouse sobre o X vermelho)
- O tooltip deve mostrar a mensagem de falha do utPLSQL (ex: "Expected: 'Hello' but got: 'World'")

**Como capturar:**
1. Rode testes que misturem pass e fail
2. Na view Testing, posicione o mouse sobre um teste falho até o tooltip aparecer
3. Recorte o painel Testing mostrando ambos os ícones + tooltip

---

### `context-menu-pks.png`
**Onde:** Guia-rápido.md, passo 4  
**O que mostrar:**
- File Explorer à esquerda com a árvore de arquivos
- Clique direito sobre um arquivo `.pks` (ex: `tests/test_hello.pks`)
- Menu de contexto aberto mostrando os itens:
  - `utPLSQL: Rodar testes do arquivo`
  - `utPLSQL: Rodar testes do arquivo com cobertura`
- Destaque visual: fundo azul de seleção sobre um dos itens utPLSQL

**Como capturar:**
1. No File Explorer, ache um `.pks`
2. Clique direito → posicione o mouse sobre `utPLSQL: Rodar testes do arquivo` (fundo azul)
3. Recorte a área do Explorer + menu

---

### `context-menu-folder.png`
**Onde:** Comandos.md  
**O que mostrar:**
- File Explorer com árvore de pastas (ex: pasta `tests/`)
- Clique direito sobre a **pasta** `tests/`
- Menu de contexto com os itens:
  - `utPLSQL: Rodar testes da pasta`
  - `utPLSQL: Rodar testes da pasta com cobertura`

**Como capturar:**
1. No File Explorer, clique direito sobre a pasta `tests/`
2. Recorte a área do Explorer + menu

---

### `palette-commands.png`
**Onde:** Comandos.md  
**O que mostrar:**
- Command Palette aberta (`Ctrl+Shift+P`)
- Filtro digitado: `utPLSQL`
- Lista de comandos filtrados visível:
  - `utPLSQL: Rodar todos os testes`
  - `utPLSQL: Rodar testes do arquivo`
  - `utPLSQL: Rodar testes do arquivo com cobertura`
  - `utPLSQL: Rodar testes da pasta`
  - `utPLSQL: Rodar testes da pasta com cobertura`
  - `utPLSQL: Atualizar testes`
  - `utPLSQL: Cancelar execução`
  - `utPLSQL: Mostrar informações do utPLSQL`
  - `utPLSQL: Selecionar reporter adicional...`
  - `utPLSQL: Limpar conexão da sessão`
- Pelo menos 8 comandos visíveis

**Como capturar:**
1. `Ctrl+Shift+P`, digite `utPLSQL`
2. Recorte a palette com o filtro e a lista de comandos

---

### `palette-clear-connection.png`
**Onde:** Conexão.md  
**O que mostrar:**
- Command Palette aberta
- Filtro: `limpar conexão` (ou similar)
- Comando `utPLSQL: Limpar conexão da sessão` **selecionado** (fundo azul)

**Como capturar:**
1. `Ctrl+Shift+P`, digite `limpar` até aparecer o comando
2. Use setas para selecionar o comando (fundo azul)
3. Recorte a área da palette (~600px × 80px basta)

---

### `keyboard-shortcuts.png`
**Onde:** Comandos.md  
**O que mostrar:**
- Tela de Keyboard Shortcuts (`Ctrl+K Ctrl+S`)
- Campo de busca com filtro: `utplsql`
- Resultado mostrando os comandos utPLSQL com colunas: Command, Keybinding, When
- Nenhum atalho padrão definido (coluna Keybinding vazia ou mostrando espaço para digitar)

**Como capturar:**
1. `Ctrl+K Ctrl+S`, digite `utplsql` no campo de busca
2. Recorte a área principal (lista de comandos + campo de busca)

---

### `marketplace-card.png`
**Onde:** Instalação-e-requisitos.md  
**O que mostrar:**
- Painel de Extensões (`Ctrl+Shift+X`) com busca digitada: `utPLSQL Test Runner`
- Card da extensão visível com:
  - Ícone da extensão
  - Nome: **utPLSQL Test Runner**
  - Publisher: **paneb**
  - Descrição curta
  - Botão **Install** (se não instalada) ou **Installed** (se já instalada)
- Apenas um resultado na busca

**Como capturar:**
1. Abra o painel de Extensões
2. Digite `utPLSQL Test Runner` na busca
3. Recorte o card principal da extensão (~600px × 200px)

---

### `install-from-vsix.png`
**Onde:** Instalação-e-requisitos.md  
**O que mostrar:**
- Painel de Extensões aberto
- Menu "..." (canto superior direito do painel) expandido
- Opção **Install from VSIX...** visível e destacada (ou com a seta do mouse próxima)

**Como capturar:**
1. Abra o painel de Extensões
2. Clique no `...` (canto superior direito)
3. Recorte o menu dropdown mostrando as opções (foco no "Install from VSIX")

---

### `editor-coverage-gutters.png`
**Onde:** Cobertura.md  
**O que mostrar:**
- Editor com um arquivo de código PL/SQL aberto
- Gutters de cobertura visíveis à esquerda dos números de linha:
  - **Verde** 🟢 — linhas cobertas pelos testes
  - **Vermelho** 🔴 — linhas não cobertas
- Pelo menos 5 linhas verdes e 3 vermelhas lado a lado no mesmo arquivo
- Tema claro para as cores contrastarem bem
- Arquivo de produção (não o de teste), ex: `install/packages/calculadora.sql`

**Como capturar:**
1. Rode testes com cobertura usando um arquivo que tem linhas não cobertas
2. Maximize o editor para mostrar bastante código
3. Recorte a área do editor mostrando número de linhas + gutters (~700px × 400px)

---

### `coverage-panel.png`
**Onde:** Cobertura.md  
**O que mostrar:**
- Aba **Test Coverage** aberta (parte inferior, ao lado de Terminal/Output/Problems)
- Lista de arquivos com barras e percentuais:
  - Ex: `calculadora.sql  85.3%  ████████░░  Cover 100/117 lines`
  - Ex: `dobro.sql        42.0%  ████░░░░░░  Cover 21/50 lines`
- Vários arquivos visíveis (pelo menos 3)
- Percentuais variados para ficar realista

**Como capturar:**
1. Após rodar com cobertura, abra a aba Test Coverage
2. Recorte o painel inferior (~800px × 200px)

---

### `dev-host-testing.png`
**Onde:** Como-contribuir.md  
**O que mostrar:**
- Janela do **Extension Development Host** (título da janela: `[Extension Development Host]`)
- View Testing aberta na barra lateral com suites carregadas
- De preferência, mostre também o editor com um `.pks` de teste aberto
- A barra de título da janela deve estar visível (mostra que é Dev Host)

**Como capturar:**
1. Pressione F5 no projeto da extensão para abrir o Extension Dev Host
2. Na nova janela, abra um projeto PL/SQL com testes
3. Abra a view Testing
4. Recorte a janela inteira ou área principal mostrando Testing + editor

---

### `diagram-schemas.png`
**Onde:** Requisitos-no-banco.md  
**O que mostrar:**
- Diagrama visual (criar no draw.io, Excalidraw ou similar)
- 3 caixas/containers: `UT3`, `DEV`, `TEST`
- Setas de grant de `UT3` → `DEV` e `UT3` → `TEST` com rótulos:
  - `SELECT ON DBA_SOURCE`
  - `SELECT ON DBA_OBJECTS`
  - `SELECT ON DBA_PROCEDURES`
- Seta de volta: `DEV` → `UT3` e `TEST` → `UT3` com rótulo: `lê annotations`
- Título: "Install compartilhado"
- Fundo branco, estilo flat/clean

---

## Com banco Oracle (6 prints)

### `output-terminal.png`
**Onde:** Guia-rápido.md, passo 6  
**O que mostrar:**
- Terminal de output da view Testing (painel inferior, aba "Output" do canal utPLSQL)
- Saída do `ut_documentation_reporter` mostrando:
  - Nome da suite
  - Nomes dos testes
  - Resultado de cada teste (com `[1 sec]` ou duração)
  - Resumo final: "Finished in X seconds, Y tests, Z failed, W errored"
- Texto colorido (verde para pass, vermelho para fail) se o terminal do VSCode suportar
- Pelo menos 3 testes executados no log

**Como capturar:**
1. Rode uma execução completa de testes
2. Na view Testing, clique em um teste ou na execução
3. O output aparece no painel inferior — recorte a área do terminal (~800px × 300px)

---

### `output-coverage-mapping.png`
**Onde:** Cobertura.md  
**O que mostrar:**
- Terminal de output mostrando os logs de mapeamento do `coverageSourceArgs`
- Linhas no formato:
  ```
  -- objetos mapeados pelo regex:
  --   CALCULADORA → PACKAGE BODY → install/packages/calculadora.sql
  --   DOBRO → FUNCTION → install/functions/dobro.sql
  --   LOG_AUDITORIA → (não mapeado — nenhum arquivo correspondeu)
  ```
- Pelo menos um objeto mapeado com sucesso e um não mapeado
- O log deve mostrar o nome do objeto Oracle, tipo e caminho do arquivo

**Como capturar:**
1. Ative `utplsql.dbmsOutput: true`
2. Rode testes com cobertura
3. No terminal de output, ache o bloco de mapeamento
4. Recorte a área relevante do terminal (~800px × 200px)

---

### `output-cli-args.png`
**Onde:** Modo-de-invocação.md  
**O que mostrar:**
- Terminal de output com os argumentos recebidos pelo CLI
- No modo `java`: argumentos literais com `^` e `|` intactos
  ```
  Args recebidos: -regex_expression=^.*[/\\](\\w+)[/\\](\\w+)\\.sql$ ...
  ```
- De preferência, fazer **dois prints lado a lado** ou um comparativo:
  - Esquerda/topo: modo `launcher` mostrando `^` ausente
  - Direita/baixo: modo `java` mostrando `^` presente
- Se for um único print, mostre o modo `java` com os args literais

**Como capturar:**
1. Configure `utplsql.coverageSourceArgs` com regex que use `^` e `$`
2. Ative `utplsql.quiet: false`
3. Rode com cobertura nos dois modos (launcher e java)
4. Compare os outputs — capture o que mostra a diferença

---

### `quickpick-reporters.png`
**Onde:** Reporters.md  
**O que mostrar:**
- QuickPick dropdown aberto no topo da janela
- Título: "Selecionar reporter adicional"
- Lista de reporters disponíveis:
  - `UT_DOCUMENTATION_REPORTER`
  - `UT_JUNIT_REPORTER`
  - `UT_COVERAGE_COBERTURA_REPORTER`
  - (outros reporters que existirem no banco)
- Um reporter **selecionado** (fundo azul)

**Como capturar:**
1. `Ctrl+Shift+P` → `utPLSQL: Selecionar reporter adicional...`
2. O QuickPick abre no topo — recorte a área do dropdown (~700px × 250px)

---

### `sqlcl-compile.png`
**Onde:** Guia-rápido.md, passo 2  
**O que mostrar:**
- Terminal do SQLcl (ou extensão Oracle do VSCode) mostrando:
  ```
  SQL> ALTER PACKAGE test_hello COMPILE;
  
  Package altered.
  ```
- Ou o output de `@tests/test_hello.pks` mostrando:
  ```
  Package created.
  Package body created.
  ```

**Como capturar:**
1. Abra um terminal (pode ser o integrado do VSCode ou SQLcl externo)
2. Execute a compilação do package de teste
3. Recorte a área do terminal mostrando o comando + resultado (~700px × 150px)

---

### `sqlcl-version.png`
**Onde:** Instalação-e-requisitos.md  
**O que mostrar:**
- Terminal SQLcl/SQL Developer mostrando:
  ```sql
  SQL> SELECT ut_meta.version() FROM dual;
  
  UT_META.VERSION()
  ________________________________________
  v3.2.3
  ```

**Como capturar:**
1. Conecte no banco via SQLcl
2. Execute `SELECT ut_meta.version() FROM dual;`
3. Recorte o terminal mostrando query + resultado (~700px × 150px)

---

## Checklist de captura

- [ ] `test-explorer-suites.png`
- [ ] `sidebar-testing-icon.png`
- [ ] `test-explorer-hello-world.png`
- [ ] `test-explorer-pass-fail.png`
- [ ] `context-menu-pks.png`
- [ ] `context-menu-folder.png`
- [ ] `palette-commands.png`
- [ ] `palette-clear-connection.png`
- [ ] `keyboard-shortcuts.png`
- [ ] `marketplace-card.png`
- [ ] `install-from-vsix.png`
- [ ] `editor-coverage-gutters.png`
- [ ] `coverage-panel.png`
- [ ] `dev-host-testing.png`
- [ ] `diagram-schemas.png`
- [ ] `output-terminal.png`
- [ ] `output-coverage-mapping.png`
- [ ] `output-cli-args.png`
- [ ] `quickpick-reporters.png`
- [ ] `sqlcl-compile.png`
- [ ] `sqlcl-version.png`
