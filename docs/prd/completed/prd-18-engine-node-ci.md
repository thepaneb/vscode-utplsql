# PRD-18 — Alinhamento `engines.node` com CI

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-18 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.7.1 |
| Arquivos afetados | `package.json`, `.github/workflows/ci.yml`, `AGENTS.md` |

## 1. Resumo

Resolver a contradição entre `engines.node ^24.0.0` declarado no `package.json` e a matrix do CI que testa Node 20, 22 e 24. A extensão não usa APIs exclusivas do Node 24 (compila e testa em 20/22), mas declara requisito 24+. Escolher entre relaxar o engine ou restringir o CI.

## 2. Contexto e problema

- `package.json` linha 12: `"node": "^24.0.0"` — só Node 24+ é suportado oficialmente.
- `AGENTS.md`: "Requer Node 24+ local para `tsc`/test runner/`vsce`".
- `.github/workflows/ci.yml`: matrix `node-version: [20, 22, 24]`.
- A extensão compila e testa com sucesso em Node 20 e 22 (auditoria confirmou).
- `npm ci` em Node 20/22 **não falha** — apenas emite warning por engine mismatch porque `--engine-strict` não está ativado.

Isso significa que o CI está testando versões que o `package.json` diz não serem suportadas, mas que na prática funcionam. Ou a restrição é artificial (e deve ser relaxada), ou o CI está errado (e deve restringir).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Eliminar a contradição entre engine declarado e CI.
- Testar apenas versões realmente suportadas — ou declarar suporte ampliado.

**Não-objetivos**
- Migrar para APIs exclusivas do Node 24.
- Alterar a toolchain de build (tsc, biome, etc.).

## 4. Requisitos

### RF1 — Escolher uma das três opções

| Opção | Descrição | Impacto |
|---|---|---|
| **A)** Relaxar engine | `engines.node` de `^24.0.0` para `>=20.0.0` | Suporte ampliado, reflete realidade do CI |
| **B)** Restringir CI | Matrix de `[20, 22, 24]` para `[24]` | Alinhado com AGENTS.md, quebra menos |
| **C)** Engine strict | Adicionar `--engine-strict` no `npm ci` do CI | Node 20/22 falham no CI, mas CI continua rodando |

### RF2 — Atualizar documentação

- `AGENTS.md`: atualizar menção a "Requer Node 24+ local".
- `README.md` (se houver menção a versão de Node).

**Não-funcionais**
- RNF1 — CI deve continuar passando para todas as versões na matrix após a mudança.
- RNF2 — `npm ci` local não deve quebrar para devs com Node 20/22 (se opção A).

## 5. Solução proposta

**Recomendação: Opção A** — relaxar engine para `>=20.0.0`.

A extensão não usa APIs Node 24 exclusivas. TypeScript 6.0.3 compila target ES2021 sem problemas em Node 20. O CI já valida 20/22/24 há meses. A restrição `^24.0.0` é artificial — provavelmente definida quando o projeto adotou Node 24 como versão de desenvolvimento, sem intenção de excluir versões anteriores.

### 5.1 `package.json`

```json
"engines": {
  "vscode": "^1.88.0",
  "node": ">=20.0.0"
}
```

### 5.2 `AGENTS.md`

```diff
- Requer Node 24+ local para `tsc`/test runner/`vsce`.
+ Requer Node 20+ local. CI testa 20/22/24. `.nvmrc` usa 24.
```

## 6. Configuração

Nenhuma nova setting.

## 7. Plano de testes

- **CI**: confirmar que matrix `[20, 22, 24]` passa com `npm ci && npm run compile && npm test`.
- **Local**: testar `npm ci` em Node 20 e 22.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Engine relaxado permite versões com bugs | CI cobre 20/22/24 — se Node 20 tiver bug que quebre a extensão, o CI pega |
| AGENTS.md desatualizado | Atualizar junto com o `package.json` |

## 9. Rollout

- Release 0.7.1 (patch).
- Atualizar `CHANGELOG.md`.
- Publicar via release no GitHub.

## 10. Critérios de aceite

- `package.json` e CI são consistentes entre si.
- CI matrix passa em todas as versões.
- `AGENTS.md` reflete a mudança.

## 11. Questões em aberto

- Deveríamos manter `.nvmrc` em 24 mesmo suportando Node 20+? Sim — `.nvmrc` é a versão recomendada para desenvolvimento, não o mínimo suportado.
