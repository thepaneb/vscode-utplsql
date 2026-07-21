# PRD-36 — Correção do parse de `reporters` com descrições + flag `coverageEnabled`

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.7.2 |
| Arquivos afetados | `src/cliReporters.ts`, `src/runner.ts`, `src/test/unit/cliReporters.test.ts` |

## 1. Resumo

O `parseReportersOutput` mantém a linha inteira do output do CLI (ex:
`UT_COVERAGE_COBERTURA_REPORTER - desc`), mas a comparação em `runner.ts`
espera o nome exato. Com o utPLSQL >= 3.2.x, o comando `reporters` inclui
descrições após o nome, fazendo a comparação falhar silenciosamente. A
extensão conclui que o reporter não existe e desabilita cobertura.

Adicionalmente, a flag `coverage` em `runner.ts` não é atualizada quando o
reporter não é encontrado, fazendo `applyCoverage` rodar desnecessariamente e
emitir mensagem de diagnóstico enganosa.

## 2. Contexto e problema

### Causa raiz

O utPLSQL 3.2.x formata a saída de `reporters` com descrições:

```
Core reporters:
UT_DOCUMENTATION_REPORTER - Plain-text documentation reporter
UT_JUNIT_REPORTER - JUnit-compatible reporter
UT_COVERAGE_COBERTURA_REPORTER - Cobertura XML report

Extension reporters:
UT_COVERAGE_HTML_REPORTER - Coverage HTML report
```

`parseReportersOutput` (`src/cliReporters.ts:10-14`) faz apenas `.map(l => l.trim())`,
preservando a linha completa (`UT_COVERAGE_COBERTURA_REPORTER - Cobertura XML report`).

A comparação em `runner.ts:110` é exata:
```typescript
!reporters.some((r) => r.toUpperCase() === 'UT_COVERAGE_COBERTURA_REPORTER')
```

A string `UT_COVERAGE_COBERTURA_REPORTER - Cobertura XML report` `.toUpperCase()`
não bate com `UT_COVERAGE_COBERTURA_REPORTER` → cobertura desabilitada.

### Efeito colateral

Como a flag `coverage` não é atualizada, `applyCoverage` (linha 177) é chamado
de qualquer forma, emitindo o diagnóstico falso sobre `GRANT EXECUTE ON SYS.DBMS_PROFILER`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Corrigir `parseReportersOutput` para extrair apenas o identificador do reporter
- Adicionar flag `coverageEnabled` local em `executeRun` para impedir `applyCoverage` quando reporter não disponível
- Simplificar diagnóstico do `applyCoverage` (remover sugestão de cmd.exe)
- Adicionar testes para linhas com descrição após o nome

**Não-objetivos**
- Alterar `listReporters` (usa `parseReportersOutput` internamente)
- Alterar `buildInvocation`
- Suportar seções hierárquicas no output (Core/Extension reporters) — ficam como tokens extras inofensivos
- Alterar o formato de output do utPLSQL CLI

## 4. Requisitos

### RF1 — `parseReportersOutput` extrai apenas identificador

Usar regex `^([A-Za-z0-9_]+)` no lugar de `l.trim()`:

```typescript
export function parseReportersOutput(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((l) => {
      const m = l.trim().match(/^([A-Za-z0-9_]+)/);
      return m ? m[1] : '';
    })
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('['));
}
```

| Entrada | Token extraído |
|---|---|
| `UT_COVERAGE_COBERTURA_REPORTER` | `UT_COVERAGE_COBERTURA_REPORTER` |
| `UT_COVERAGE_COBERTURA_REPORTER - desc` | `UT_COVERAGE_COBERTURA_REPORTER` |
| `UT_REPORTER:desc` | `UT_REPORTER` |
| `  UT_REPORTER  ` | `UT_REPORTER` |
| `[section]` | `` → filtrado |
| `Core reporters:` | `Core` → inofensivo |

### RF2 — Flag `coverageEnabled` em `executeRun`

```typescript
let coverageEnabled = coverage;
if (coverage) {
  const reporters = await listReporters(cfg, connection);
  if ('error' in reporters) {
    coverageEnabled = false;
    // ...
  } else if (!reporters.some(...)) {
    coverageEnabled = false;
    // ...
  }
}
// ...
if (coverageEnabled) {
  applyCoverage(coveragePath, root, cfg.sourcePath, run, state, folders);
}
```

### RF3 — Simplificar diagnóstico `applyCoverage`

Remover sugestão de `cmd.exe` e modo `java` (a causa raiz não é o shell).

### RF4 — Testes novos em `cliReporters.test.ts`

| Teste | Entrada | Esperado |
|---|---|---|
| Nome com descrição após espaço e `-` | `UT_A - desc` | `['UT_A']` |
| Nome com descrição após espaço | `UT_A desc` | `['UT_A']` |
| Múltiplos reporters com descrições | `UT_A - x\nUT_B - y` | `['UT_A', 'UT_B']` |

## 5. Solução proposta

### 5.1 `src/cliReporters.ts`

Única alteração: a linha 13 — trocar `.map((l) => l.trim())` por
`.map((l) => { const m = l.trim().match(/^([A-Za-z0-9_]+)/); return m ? m[1] : ''; })`.

### 5.2 `src/runner.ts`

Duas alterações:
1. **Linha 105**: introduzir `let coverageEnabled = coverage;` e setar para `false` nos branches onde o reporter não está disponível
2. **Linha 177**: trocar `if (coverage)` por `if (coverageEnabled)`
3. **Linha 298-304**: remover sugestão de `cmd.exe`/`java`

## 6. Configuração

Nenhuma.

## 7. Plano de testes

- **Unitários**:
  - `cliReporters.test.ts`: 3 novos testes de parse com descrições (RF4)
  - 6 testes existentes continuam passando
- **Integração**: 18 testes existentes continuam passando
- **Validação manual**: Windows/Linux com utPLSQL 3.2.x → `runFileCoverage` gera cobertura

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Nomes de reporter com `-` (ex: `MY-REPORTER`) | Regex captura só `MY`. Reporters oficiais usam `_`. |
| Section headers como `Core reporters:` viram `Core` | Inofensivo — nenhum reporter oficial chama `Core` |

## 9. Rollout

- Release 0.7.2 (patch, agrupado com PRD-35)
- CHANGELOG: `Fix: parse de reporters com descrições no utPLSQL 3.2.x`

## 10. Critérios de aceite

- `npm test` — 134 + 3 = 137 unitários passam
- `npm run lint` — sem novos warnings
- `npm run test:integration` — 18 testes passam
- Com utPLSQL 3.2.x, cobertura funciona
- Sem reporter de cobertura, não aparece diagnóstico falso

## 11. Questões em aberto

- Confirmar formato exato da saída de `utplsql reporters` no 3.2.2.
