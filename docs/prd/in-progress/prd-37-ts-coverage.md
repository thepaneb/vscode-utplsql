# PRD-37 — Cobertura de código TypeScript com `c8`

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-25 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.9.0 |
| Arquivos afetados | `package.json`, `package-lock.json`, `.c8rc` (novo) |

## 1. Resumo

Adicionar `c8` como ferramenta de cobertura TypeScript + script `test:coverage`,
com exclusão de `src/test/**`, relatório HTML navegável e threshold mínimo de
cobertura de linhas.

## 2. Contexto e problema

### 2.1 `src/test/` está dentro de `src/`

A pasta de testes unitários e de integração reside em `src/test/` (convenção
TypeScript com `rootDir: "src"` no `tsconfig.json`). Isso significa que qualquer
ferramenta de cobertura que analise `src/` incluirá os próprios arquivos de teste
no relatório, distorcendo as métricas (testes têm 100% de cobertura por definição
e inflam os números gerais).

### 2.2 Estado atual

- `c8` já existiu como devDependency no projeto, mas foi removido na PRD-20 por
  não estar sendo utilizado.
- O projeto usa exclusivamente `node --test` (sem cobertura configurada).
- O `package.json` não possui script de cobertura.
- O CI roda apenas `npm run lint` + `npm test` (sem cobertura).

### 2.3 Decisão: `c8` vs. cobertura nativa do Node

| Critério | `c8` | Node `--experimental-test-coverage` |
|---|---|---|
| Maturidade | Estável, amplamente usado | Experimental (Node 22+), ainda evoluindo |
| Exclusão de arquivos | `--exclude` nativo e flexível | `--test-coverage-exclude` (Node 23+) |
| Reporters | `text`, `lcov`, `html`, `json-summary` | Apenas texto no terminal |
| Integração CI | Suporte nativo a `lcov` para GitHub/Sonar/etc. | Precisa de pós-processamento |
| Thresholds | `--check-coverage --lines 80` (bloqueia) | Sem suporte a thresholds |

**Decisão: `c8`** — mais maduro, suporte a thresholds, múltiplos reporters e
integração direta com ferramentas de CI externas.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Instalar `c8` como devDependency.
- Criar script `npm run test:coverage` com reporters `text` + `lcov` + `html`.
- Configurar `.c8rc` com exclusão de `src/test/**` e `out/**`.
- Definir threshold de 80% linhas/statements, 70% funções, 60% branches.
- Garantir que `coverage/` está no `.gitignore` e `.vscodeignore`.

**Não-objetivos**
- Threshold bloqueante no CI (apenas local, ver seção 5.3).
- Integrar com serviços externos (Codecov, Coveralls).
- Mover a pasta `src/test/` para a raiz do projeto.

## 4. Requisitos

### RF1 — Script `test:coverage`

```json
"test:coverage": "npm run compile && c8 node scripts/run-tests.cjs"
```

A configuração (`exclude`, reporters, threshold) fica centralizada no `.c8rc`
(RF2), mantendo o script limpo. O `compile` é inline (não depende do
`pretest:unit` que inclui `lint`) — assim a cobertura roda mesmo durante
iterações com lint pendente.

### RF2 — Arquivo `.c8rc`

```json
{
  "exclude": ["src/test/**", "out/**", "node_modules/**"],
  "reporter": ["text", "lcov", "html"],
  "check-coverage": true,
  "lines": 80,
  "branches": 60,
  "functions": 70,
  "statements": 80
}
```

- `out/**` excluído porque o `c8` pode tentar analisar os `.js` compilados além
  dos `.ts` via source maps.
- Thresholds iniciais: 80% linhas/statements, 70% funções, 60% branches. Valores
  realistas para um projeto que já tem boa cobertura de testes unitários. Se o
  baseline real for menor, ajusta-se após a primeira medição.

### RF3 — Relatórios de saída

- Terminal: tabela de cobertura (`text`).
- `coverage/lcov.info`: compatível com ferramentas de CI.
- `coverage/index.html`: relatório navegável no navegador.
- Nenhum arquivo de `src/test/` ou `out/` no relatório.

## 5. Solução proposta

### 5.1 Instalação e arquivos

```bash
npm install -D c8
```

Criar `.c8rc` na raiz com a configuração do RF2.

### 5.2 Script no `package.json`

```jsonc
"test:coverage": "npm run compile && c8 node scripts/run-tests.cjs"
```

### 5.3 Separação `pretest:unit` vs. `test:coverage`

O script atual `pretest:unit` roda `npm run compile && npm run lint`. Se o
`test:coverage` herdasse esse `pre`, um erro de lint bloquearia a geração de
cobertura durante desenvolvimento. A solução é `test:coverage` rodar seu próprio
`compile` inline, sem lint:

```
test:coverage   →  compile (inline)  →  c8 → node scripts/run-tests.cjs
test:unit       →  pretest:unit      →  compile + lint → node scripts/run-tests.cjs
```

Isso mantém `npm test` (= `test:unit`) rigoroso com lint, enquanto
`test:coverage` é mais permissivo para iterações rápidas.

### 5.4 CI

Nenhuma alteração no `ci.yml`. O threshold do `.c8rc` é aplicado apenas para uso
local. Se no futuro quiser adicionar ao CI:

```yaml
- run: npm run test:coverage
```

O próprio `c8` sairá com código 1 se o threshold não for atingido, reprovando o
job.

### 5.5 Arquivos ignorados

Verificar `.gitignore` e `.vscodeignore` contêm:

```gitignore
coverage/
```

## 6. Configuração

Nenhuma setting de extensão — ferramenta de desenvolvimento apenas.

## 7. Plano de testes

- **Validação**: rodar `npm run test:coverage` e verificar:
  1. Tabela de cobertura aparece no terminal.
  2. Nenhum arquivo de `src/test/` ou `out/` listado.
  3. `coverage/index.html` gerado e abrível no navegador.
  4. Se o baseline atual estiver abaixo dos thresholds definidos, ajustar os
     valores no `.c8rc` **após medir a primeira vez** (não usar thresholds sem
     baseline real).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Thresholds altos demais e `c8` falha na primeira execução | Medir baseline primeiro; thresholds são ajustáveis no `.c8rc` |
| `out/**` aparece no relatório por source maps | Exclusão `out/**` no `.c8rc` resolve |
| `c8` conflita com Node 20 na matrix CI | `c8` suporta Node 16+; sem conflito conhecido |
| `scripts/run-tests.cjs` usa `spawnSync` e pode não propagar o coverage do V8 | `c8` funciona com `spawnSync` — injeta `NODE_V8_COVERAGE` antes da execução e coleta após |

## 9. Rollout

1. `npm install -D c8`
2. Criar `.c8rc` com thresholds e exclusões
3. Adicionar script `test:coverage` ao `package.json`
4. Rodar `npm run test:coverage` para medir baseline real
5. Ajustar thresholds no `.c8rc` se necessário
6. Verificar `.gitignore` e `.vscodeignore` contêm `coverage/`
7. Incrementar versão, atualizar `CHANGELOG.md`
8. Release 0.9.0 via GitHub workflow

## 10. Critérios de aceite

- `npm run test:coverage` executa e exibe tabela de cobertura no terminal.
- Nenhum arquivo de `src/test/` ou `out/` aparece no relatório.
- `coverage/index.html` é gerado e pode ser aberto no navegador.
- `coverage/lcov.info` é gerado.
- `npm test` continua funcionando inalterado.
- `npm run lint` passa.
- `coverage/` está no `.gitignore` e `.vscodeignore`.

## 11. Questões em aberto

- Nenhuma.
