# PRD-35 — Correção de cobertura no Windows + blindagem de testes para argumentos CLI

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.7.2 |
| Arquivos afetados | `src/cli.ts`, `src/runner.ts`, `src/test/unit/cli.test.ts`, `src/test/unit/runner.test.ts` |

## 1. Resumo

Corrigir a falha de geração de cobertura no Windows com `invocation: launcher`,
causada pela dupla camada de quoting entre `quoteArg` e o wrap interno do
Node.js no `cmd.exe`. A solução bypassa o wrap extra chamando `cmd.exe`
diretamente com `shell: false`. Inclui blindagem de testes unitários para
prevenir regressões em argumentos com caminhos Windows, padrões regex e
strings com `=`.

## 2. Contexto e problema

No modo `launcher`, o `runCli` concatena todos os argumentos via `quoteArg` e
os passa como string única para `cp.spawn` com `shell: true`. No Windows, o
Node.js internamente faz:

```
spawn('cmd.exe', ['/d', '/s', '/c', '"<comando>"'])
```

O `<comando>` já contém aspas dos args citados por `quoteArg` (ex:
`"-type_mapping=packages=PACKAGE BODY/..."`). O `/S` do `cmd.exe` tira a
primeira e última `"`, mas com múltiplas aspas internas o resultado pode não
reconstituir corretamente os argumentos originais — especialmente com os
padrões regex dos `coverageSourceArgs` que contêm `\\`, `\w+` e `$`.

Além disso, `listReporters` em `runner.ts:106` roda o CLI via `shell: true`
para validar se o reporter de cobertura existe. Se essa chamada falhar (mesmo
que o CLI de teste funcione), os args de cobertura nunca são adicionados, mas
`applyCoverage` é chamado de qualquer forma (linhas 174-176), exibindo a
mensagem enganosa sobre `GRANT EXECUTE ON SYS.DBMS_PROFILER`.

### Lacuna de testes

Os testes atuais de `quoteArg` (`cli.test.ts`) não cobrem:

| Cenário | Risco |
|---|---|
| Caminhos Windows com `\` (`-o=C:\...\coverage.xml`) | `cmd.exe` interpreta `\"` como escape |
| Padrões regex com `\\` e `$` (`coverageSourceArgs`) | Quoting duplo quebra metacaracteres |
| Strings com `=` e espaços (`-type_mapping=...`) | Quoting parcial gera inconsistência |
| Diagnóstico do `applyCoverage` com arquivo ausente | Sem verificação da mensagem de erro |

## 3. Objetivos / Não-objetivos

**Objetivos**
- Corrigir a falha de cobertura no Windows modo `launcher`
- Eliminar a dupla camada de quoting (`Node.js` + `quoteArg`) no Windows
- Adicionar testes unitários para `quoteArg` com caminhos Windows, regex e `=`
- Adicionar teste para diagnóstico do `applyCoverage`
- Logar args do CLI (sem connection) para facilitar debugging futuro

**Não-objetivos**
- Alterar `quoteArg` (mantém compatibilidade com Unix)
- Alterar `buildInvocation` ou `listReporters`
- Testes de integração cross-platform para o caminho Windows (CI roda Linux)
- Suporte a novos modos de invocação

## 4. Requisitos

### RF1 — Bypass do wrap duplo no Windows

No `runCli`, detectar Windows e usar `cmd.exe` diretamente com `shell: false`,
evitando que o Node.js adicione `"..."` ao redor do comando já quotado.

```typescript
// src/cli.ts — dentro de runCli
const child = shell
  ? (process.platform === 'win32'
    ? cp.spawn('cmd.exe', ['/d', '/s', '/c', [file, ...args].map(quoteArg).join(' ')],
        { cwd, shell: false, windowsHide: true })
    : cp.spawn([file, ...args].map(quoteArg).join(' '),
        { cwd, shell: true, windowsHide: true }))
  : cp.spawn(file, args, { cwd, shell: false, windowsHide: true });
```

Linux/macOS mantêm o comportamento atual inalterado.

### RF2 — Diagnóstico aprimorado em `applyCoverage`

Quando `coverage.xml` não existe, exibir:
- Caminho esperado do arquivo
- Conteúdo do diretório temp (lista de arquivos ou "não encontrado")
- Sugestão de tentar modo `java` como alternativa

### RF3 — Log de args do CLI

Antes de executar o CLI, logar os argumentos sem a string de conexão:

```typescript
// src/runner.ts — após buildInvocation, antes de runCli
const safeArgs = inv.args.map(a =>
  a === connection ? '***' : a.replace(connection, '***')
);
run.appendOutput(`[debug] CLI: ${inv.file} ${safeArgs.join(' ')}\r\n`);
```

### RF4 — Testes de `quoteArg` com caminhos e regex

Adicionar a `src/test/unit/cli.test.ts`:

| Teste | Input | Esperado |
|---|---|---|
| Caminho Windows sem espaço | `-o=C:\Temp\cov.xml` | `-o=C:\Temp\cov.xml` (sem alteração) |
| Caminho Windows com espaço | `-o=C:\My Docs\cov.xml` | `"-o=C:\My Docs\cov.xml"` |
| Regex `coverageSourceArgs` | `-regex_expression=.*[/\\](\w+)\.sql$` | `"-regex_expression=.*[/\\](\w+)\.sql$"` |
| `type_mapping` com `/` e `=` | `-type_mapping=p=PACKAGE BODY/f=FUNCTION` | `"-type_mapping=p=PACKAGE BODY/f=FUNCTION"` |

### RF5 — Teste do diagnóstico `applyCoverage`

Adicionar a `src/test/unit/runner.test.ts`:

Teste que verifica se, quando o arquivo de cobertura não existe, a saída
contém o caminho esperado e a lista de arquivos do diretório temp.

**Não-funcionais**
- RNF1 — `npm test` (129 testes) continua passando sem alteração
- RNF2 — `npm run lint` (biome) sem novos warnings
- RNF3 — `npm run test:integration` (18 testes) continua passando

## 5. Solução proposta

### 5.1 `src/cli.ts` — Separação do spawn Windows

O único trecho alterado é a construção do `child` dentro de `runCli`:

```typescript
const child = shell
  ? (process.platform === 'win32'
    ? cp.spawn('cmd.exe', ['/d', '/s', '/c', [file, ...args].map(quoteArg).join(' ')],
        { cwd, shell: false, windowsHide: true })
    : cp.spawn([file, ...args].map(quoteArg).join(' '),
        { cwd, shell: true, windowsHide: true }))
  : cp.spawn(file, args, { cwd, shell: false, windowsHide: true });
```

**Justificativa**: No Unix, `spawn(string, { shell: true })` usa `/bin/sh -c`,
que não adiciona wrap extra — a string é passada literalmente. No Windows, o
Node.js adiciona `"..."` ao redor para o `cmd.exe`, introduzindo a camada
extra. Chamar `cmd.exe` diretamente elimina essa diferença.

### 5.2 `src/runner.ts` — Log de args + diagnóstico

- **Log de args**: inserir entre `buildInvocation` e `runCli`, usando
  `run.appendOutput`
- **Diagnóstico `applyCoverage`**: mostra caminho esperado, lista de arquivos
  no dir temp, sugestão do modo `java`

### 5.3 `src/test/unit/cli.test.ts` — Blindagem de `quoteArg`

Novos testes unitários (função pura, sem dependência de SO):

```
quoteArg: caminho Windows sem espaco nao e alterado
quoteArg: caminho Windows com espaco e citado
quoteArg: regex de coverageSourceArgs e citado pelo $
quoteArg: type_mapping com espacos e barra e citado
```

### 5.4 `src/test/unit/runner.test.ts` — Diagnóstico applyCoverage

Teste que cria diretório temp vazio, chama `applyCoverage` para arquivo
inexistente e verifica:
- `appendOutput` contém `[cobertura] relatório não gerado`
- `appendOutput` contém o caminho esperado no formato `esperado em:`
- `appendOutput` contém `(vazio)` como lista de arquivos

## 6. Configuração

Nenhuma. Sem novas settings, comandos ou menus.

## 7. Plano de testes

- **Unitários**:
  - `cli.test.ts`: 4 novos testes de `quoteArg` (RF4)
  - `runner.test.ts`: 1 novo teste de `applyCoverage` diagnóstico (RF5)
- **Integração**:
  - Manter os 18 testes existentes; não adicionar novos (Windows cross-platform
    inviável no CI Linux)
- **Validação manual**:
  - Windows 10/11 com `invocation: launcher`: rodar `runFileCoverage` e
    verificar se cobertura aparece
  - Mesmo cenário com `invocation: java`: verificar que não houve regressão
  - Linux/macOS: rodar `runFileCoverage` e verificar que cobertura funciona
    (não quebrou)

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `cmd.exe /d /s /c` sem aspas externas pode interpretar `&` ou `\|` na connection string como comando | A connection string já está no args array e o `quoteArg` cita qualquer arg com metacaracteres; `cmd.exe` trata aspas internas como toggle |
| Mudança no `runCli` afeta `listReporters`/`getCliInfo` que também usam `shell: true` | Testado — ambos passam nos testes de integração (modo launcher no Linux e java) |
| Teste `applyCoverage` depende de `fs.mkdtempSync` — pode colidir com outros testes | Usa `os.tmpdir()` isolado, limpeza no `finally`, igual aos testes existentes em `runner.test.ts` |

## 9. Rollout

- **Release alvo**: patch 0.7.2
- **Estratégia**: o código Windows é condicional (`process.platform === 'win32'`),
  então Unix não é afetado; deploy direto
- **CHANGELOG.md**: `Fix: relatório de cobertura não gerado no Windows com modo launcher`

## 10. Critérios de aceite

- `npm test` — 129 unitários passam + 5 novos = 134
- `npm run lint` — sem novos warnings
- `npm run test:integration` — 18 testes passam (Linux)
- No Windows nativo, `runFileCoverage` com `launcher` gera cobertura
- No Windows nativo, `runFileCoverage` com `java` continua funcionando
- No Linux, `runFileCoverage` com `launcher` continua funcionando (sem regressão)

## 11. Questões em aberto

- Confirmar se o `.bat` do utPLSQL-cli no Windows usa `%*` (forward de todos os
  argumentos). Se usar `%1`–`%9`, args de cobertura que vêm depois podem ser
  truncados — mas isso é externo à extensão.
