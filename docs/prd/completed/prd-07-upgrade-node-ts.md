# PRD-07 — Upgrade Node 24 + TypeScript 6.0

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Análise automatizada |
| Data | 2026-07-02 |
| Componente | Infraestrutura do projeto |
| Versão alvo | 0.4.0 |
| Arquivos afetados | `package.json`, `tsconfig.json`, `.nvmrc` (novo), `.github/workflows/*` |

## 1. Resumo

Atualizar as ferramentas de desenvolvimento para Node 24 LTS e TypeScript 6.0,
aproveitando novos recursos e eliminando riscos de segurança por versões
atingindo End-of-Life.

## 2. Contexto e problema

**Node 20 encerrou o suporte em 30/abril/2026.** O projeto depende de
`@types/node ^20.11.30`, sem `engines.node` definido, e não possui `.nvmrc`.
Embora a extensão execute no Node embarcado do VSCode (Electron), os scripts
de build/teste (`npm run compile`, `node test/...`) rodam no Node do sistema.

**TypeScript 5.4.5** resolve atualmente para 5.9.3, versão esta que já está
três releases atrás. O TS 6.0 (última versão JavaScript-based) é o precursor
obrigatório do TS 7.0 (Go native, 10× mais rápido) — adiar a migração acumula
débito técnico.

## 3. Análise de impacto — Node 20 → 24

### Quebras que **não** afetam o projeto

| Remoção/Depreciação | Status no projeto |
|---|---|
| `url.parse()` runtime-deprecated | Não usado |
| `tls.createSecurePair` removido | Não usado |
| `SlowBuffer` deprecated | Não usado |
| `crypto.createCipher`/`createDecipher` removidos | Não usado |
| `require()` de ESModules (mudou de experimental para estável) | Só usa `import * as`, sem `require()` dinâmico |
| MSVC → ClangCL (Windows) | Sem módulos nativos para rebuild |
| `AsyncLocalStorage` default `AsyncContextFrame` | Não usado |

### Mudanças que **exigem ação**

| Mudança | Ação necessária |
|---|---|
| `@types/node` desatualizado | Bump para `^24` |
| Sem `engines.node` | Adicionar `"node": "^20"` → `"^24"` em `package.json` |
| Sem `.nvmrc` | Criar `.nvmrc` com `24` para alinhar times/CI |

### Novos recursos aproveitáveis

| Recurso | Versão | Potencial uso |
|---|---|---|
| `fs.glob()` / `fs.promises.glob()` | Node 22+ | Substituir `vscode.workspace.findFiles()` em scripts auxiliares |
| `--experimental-strip-types` | Node 22+ | Rodar `.ts` diretamente em scripts de dev (sem `tsc`) |
| `WebSocket` global (cliente) | Node 22+ | Futuro: conectar direto no banco? |
| `URLPattern` global | Node 24 | Parsing de URLs de conexão |

## 4. Análise de impacto — TypeScript 5.9 → 6.0

### Mudanças de default (não afetam por já serem explícitas)

| Default novo | Já explícito no tsconfig? |
|---|---|
| `strict: true` | Sim (`"strict": true`) |
| `target: es2025` | Sim (`"target": "ES2021"`) |
| `module: esnext` | Sim (`"module": "node16"`) |
| `esModuleInterop: true` | Sim (`"esModuleInterop": true`) |
| `moduleResolution "classic"` removido | Já migramos para `"node16"` |
| `rootDir: .` | Sim (`"rootDir": "src"`) |

### Mudanças que **exigem ação**

| Mudança | Ação necessária |
|---|---|
| `"types"` agora default `[]` | Adicionar `"types": ["node"]` ao `tsconfig.json` |
| `"moduleResolution": "node"` removido | Já migrado para `"node16"` (PRD-02) |
| `"noUncheckedSideEffectImports": true` | Verificar se causa erros (provável que não) |
| Import assertions `assert` → `with` | Não usado no projeto |

### Novos recursos aproveitáveis

| Recurso | Benefício |
|---|---|
| `--stableTypeOrdering` | Preparar para TS 7.0 (validar compatibilidade) |
| `es2025` target/lib | Poder usar features mais novas no futuro |
| Subpath imports `#/` | Organizar imports internos (opcional) |

## 5. Solução proposta

### 5.1 `package.json`

```jsonc
{
  "engines": {
    "vscode": "^1.88.0",
    "node": "^24.0.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "^6.0.3"
  }
}
```

### 5.2 `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "module": "node16",
    "target": "ES2021",
    "lib": ["ES2021"],
    "outDir": "out",
    "rootDir": "src",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node16",
    "types": ["node"]            // ← explícito (default mudou no TS6)
  }
}
```

### 5.3 `.nvmrc` (novo)

```
24
```

### 5.4 CI (`.github/workflows/*`)

Atualizar `node-version` de `20` para `24` em todos os workflows.

## 6. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `@types/node ^24` expõe tipos de APIs que não existem no Node do VSCode | `target`/`lib` continuam `ES2021`; usar só o que o runtime do VSCode suporta |
| TS 6.0 `noUncheckedSideEffectImports` quebra algo | Testar com `npx tsc --noUncheckedSideEffectImports false` se necessário |
| Dependência interna não compatível com Node 24 | `npm ls` para checar; nenhuma depende de módulo nativo |
| TS 7.0 muda API programática | TS 6.0 foi desenhado como ponte; `--stableTypeOrdering` valida compatibilidade |

## 7. Plano de testes

1. `npm install` com as novas versões
2. `npm run compile` — sem erros de tipo
3. `npm test` — 21/21 unitários passando
4. `node --test` direto com Node 24
5. Verificar se `.vscode-test` baixa versão compatível

## 8. Rollout

- Release 0.4.0: bump de versão + CHANGELOG.
- Atualizar AGENTS.md com a nova versão do Node.
- CI workflow atualizado para Node 24.

## 9. Critérios de aceite

- `npm install` sem warnings de peer deps.
- `npm run compile` sem erros.
- `npm test` passa (21/21).
- `.nvmrc` presente e lido por `nvm use`.
- CI roda em Node 24.
