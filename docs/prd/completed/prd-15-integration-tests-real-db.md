# PRD-15 — Testes de integração com banco real

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-11 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.6.0 |
| Arquivos afetados | `src/test/integration/extension.test.ts`, `src/test/integration/fixtures/.gitkeep` |

## 1. Resumo

Expandir os testes de integração da extensão (`extension.test.ts`) para validar o fluxo completo com banco Oracle real: descoberta de suites a partir de arquivos `.pks` reais, execução via utPLSQL-cli e parse dos resultados JUnit/Cobertura. Os testes condicionam-se à presença da variável de ambiente `UTPLSQL_CONN`, pulando silenciosamente quando o banco não está disponível (ex.: CI).

## 2. Contexto e problema

O único teste de integração atual (`extension.test.ts`) verifica apenas:
- Extensão ativa.
- Comandos registrados.
- `utplsql.refresh` executa sem erro.
- `utplsql.clearConnection` executa sem erro.

Nenhum deles conecta a um banco real. Isso significa que:
- O fluxo `discoverWorkspace → parseSuite → controller.items` nunca é validado com arquivos reais.
- `executeRun` com `coverage=true` nunca é testado de ponta a ponta.
- O mapeamento de resultados JUnit → TestItem pode quebrar silenciosamente com novas versões do utPLSQL.
- A cobertura nunca é validada contra um Cobertura XML real.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Adicionar testes condicionais que só rodam se `UTPLSQL_CONN` estiver definida.
- Testar descoberta de 3 suites a partir de `.pks` reais em `fixtures/`.
- Testar `utplsql.showInfo` com conexão real (valida CLI, API e DB versions).
- Testar execução `utplsql.runAll` com verificação de resultados (pass/fail).
- Adicionar test para `utplsql.runFileCoverage` validando cobertura gerada.
- Documentar como configurar o ambiente para testes de integração.

**Não-objetivos**
- Modificar o código de produção da extensão.
- Testar cenários de falha de conexão (já cobertos por unitários).
- Adicionar testes de UI ou snapshot.

## 4. Requisitos

### RF1 — Teste condicional com `UTPLSQL_CONN`

Todos os testes que dependem de banco devem usar `describe.skipIf` ou guard pattern:

```typescript
const conn = process.env.UTPLSQL_CONN;
const describeDB = conn ? describe : describe.skip;

describeDB('integração com banco Oracle', () => {
  // testes aqui
});
```

Ou usar um helper:

```typescript
function hasConnection(): boolean {
  return !!(
    process.env.UTPLSQL_CONN ||
    vscode.workspace.getConfiguration('utplsql').get('connection')
  );
}
```

A mensagem de skip deve ser clara: `"Banco Oracle não disponível — defina UTPLSQL_CONN"`.

### RF2 — Teste de descoberta com `.pks` reais

```typescript
test('descobre suites dos arquivos .pks em fixtures/', async () => {
  const controller = vscode.tests.createTestController('utplsql-test', 'utPLSQL Test');
  await vscode.commands.executeCommand('utplsql.refresh');
  const items: vscode.TestItem[] = [];
  controller.items.forEach(item => items.push(item));
  assert.strictEqual(items.length, 3); // test_betwnvarchar, test_math, test_employees
  const testNames = items.map(i => i.label);
  assert.ok(testNames.some(n => n.includes('Between VARCHAR')));
  assert.ok(testNames.some(n => n.includes('Math operations')));
  assert.ok(testNames.some(n => n.includes('Employees tests')));
});
```

### RF3 — Teste de `utplsql.showInfo` com conexão

```typescript
test('showInfo retorna versões do CLI, API e DB', async () => {
  await vscode.commands.executeCommand('utplsql.showInfo');
  // Verificar que o information message foi exibido
  // (requer mock do window.showInformationMessage ou verificação indireta)
});
```

### RF4 — Teste de execução `utplsql.runAll`

```typescript
test('runAll executa e retorna resultados', async () => {
  // Mock necessário para capturar createTestRun
  // Ou usar TestRun real e verificar chamadas a passed/errored/skipped
});
```

Como o VSCode TestRun API é complexa de mockar, este teste pode se limitar a verificar que o comando não lança exceção.

### RF5 — Teste de execução com cobertura

```typescript
test('runFileCoverage gera cobertura', async () => {
  // Similar ao RF4, mas verifica addCoverage
});
```

## 5. Solução proposta

### 5.1 Estrutura do `extension.test.ts` expandido

```
src/test/integration/extension.test.ts
├── Testes existentes (sempre rodam)
│   ├── Extension is found and activates
│   ├── Commands are registered
│   ├── utplsql.refresh executes without error
│   └── utplsql.clearConnection executes without error
└── Testes condicionais (só com UTPLSQL_CONN)
    ├── discovers suites from real .pks files
    ├── showInfo returns CLI/API/DB version
    ├── runAll executes without error
    └── runFileCoverage executes without error
```

### 5.2 Helper `hasConnection`

```typescript
function hasConnection(): boolean {
  return !!(
    process.env.UTPLSQL_CONN ||
    process.env.UTPLSQL_CONNECTION ||
    vscode.workspace.getConfiguration('utplsql').get<string>('connection')
  );
}
```

### 5.3 Configuração do ambiente

O desenvolvedor deve:
1. Ter o banco Oracle rodando (PRD-13).
2. Ter o utPLSQL-cli no PATH ou configurado em `utplsql.cliPath`.
3. Ter os packages de teste instalados (PRD-14).
4. Exportar `UTPLSQL_CONN=user/pass@//host:port/service`.

Opcionalmente, configurar no `.vscode/settings.json` do workspace:
```json
{
  "utplsql.connection": "UTPLSQL_TEST/utplsql_test#2026@//localhost:1521/freepdb1",
  "utplsql.cliPath": "/home/gilcl/utplsql-cli/bin/utplsql"
}
```

### 5.4 Integração com o script de test

O `npm run test:integration` atual usa `@vscode/test-cli`. Precisamos garantir que os `.pks` de fixture estejam acessíveis no workspace aberto pelo test runner.

Verificar config em `.vscode-test.mjs`:
```js
export default defineConfig({
  workspaceFolder: '.',  // já aponta para a raiz do projeto
  // fixtures/ fica em src/test/integration/fixtures/,
  // então o workspaceFolder precisa incluir src/test/integration/
  // ou os fixtures precisam estar na raiz
});
```

Se o workspace for a raiz do projeto, os fixtures em `src/test/integration/fixtures/*.pks` serão descobertos pois o pattern default é `**/*.pks`.

## 6. Configuração

Adicionar documentação em `DEVELOPMENT.md` (ou `CONTRIBUTING.md`) sobre como configurar o ambiente para testes de integração.

**Nova seção em `DEVELOPMENT.md`:**
```markdown
## Testes de integração com banco Oracle real

1. Garanta que o container Oracle esteja rodando (ver PRD-13).
2. Execute o setup do schema de teste:
   ```bash
   docker exec -i oracle-data sqlplus -s \
     sys/Oracle#2026@//localhost:1521/freepdb1 as sysdba \
     @src/test/integration/fixtures/setup.sql
   ```
3. Defina a variável de ambiente:
   ```bash
   export UTPLSQL_CONN=UTPLSQL_TEST/utplsql_test#2026@//localhost:1521/freepdb1
   ```
4. Execute:
   ```bash
   npm run test:integration
   ```
```

## 7. Plano de testes

- **Unitários**: N/A.
- **Integração**: `npm run test:integration` com `UTPLSQL_CONN` definida.
- **Validação manual**:
  - Rodar sem `UTPLSQL_CONN` — testes condicionais devem pular.
  - Rodar com `UTPLSQL_CONN` — testes devem passar.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Teste `runAll` pode demorar > 30s | Aumentar timeout do mocha/test runner |
| Fixtures `.pks` não são copiados para o workspace de teste | Verificar `workspaceFolder` no `.vscode-test.mjs` |
| `showInfo` depende de informação visual (message box) | Usar mock ou verificar side effect (ex.: clipboard) |
| VSCode host de teste não tem `utplsql.cliPath` configurado | Usar PATH ou fallback para `java` mode com `cliHome` |

## 9. Rollout

- Release 0.6.0 (minor).
- Atualizar `CHANGELOG.md` com a melhoria nos testes de integração.
- Publicar via release no GitHub.

## 10. Critérios de aceite

- `npm run test:integration` sem `UTPLSQL_CONN` pula os testes de banco e passa.
- `npm run test:integration` com `UTPLSQL_CONN` roda todos os testes e passa.
- Teste de descoberta valida 3 suites com os labels corretos.
- Teste de `showInfo` valida versões.
- `DEVELOPMENT.md` documenta o setup.

## 11. Questões em aberto

- Como mockar `window.showInformationMessage` no teste `showInfo` sem depender de UI real?
- O timeout do test runner é configurável via mocha? Verificar `@vscode/test-cli` options.
- Devemos adicionar um script `npm run test:integration:setup` que roda o `setup.sql` automaticamente?
