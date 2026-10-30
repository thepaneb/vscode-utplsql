<!-- GENERATED FROM docs/brain/20-PRDs/prd-127-vscode-floor-1-125.md — DO NOT EDIT -->

# PRD-127 — Piso de VS Code 1.125 e runtime Node 24

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` (piso de plataforma e runtime) |
| Versão alvo | 0.19.0 |
| Arquivos afetados | `package.json`, `esbuild.config.mjs`, `scripts/docs-fidelity.cjs`, `src/test/unit/docsFidelity.test.ts`, `src/test/unit/brainScripts.test.ts`, `docs/brain/14-NFR/NFR-002*.md`, `docs/brain/14-NFR/NFR-003*.md`, `docs/brain/15-Regras/BR-PLAT-001*.md`, `docs/brain/17-Componentes/TPL-VSCODE-API*.md`, `docs/brain/60-README/README (extensão).md` (+ 23 variantes geradas), `docs/brain/70-Wiki/{Home,Installation-and-requirements}.md`, `docs/brain/80-Site/Landing page (site).md`, `CONTRIBUTING.md`, `CHANGELOG.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-94 (piso anterior), PRD-95 (ESM/ES2024), PRD-47 (toolchain), PRD-120 (ativação), NFR-002, NFR-003, BR-PLAT-001 |

## 1. Resumo

Subir o piso de `engines.vscode` de `^1.101.0` para **`^1.125.0`** — o primeiro
stable com **Node 24.15.0** no Extension Host que também tem **`@types/vscode`
publicado**. A 1.123 é a primeira stable com Node 24, mas as tags 1.123/1.124 não
têm tipos no npm; a 1.125 mantém a regra `@types/vscode == piso` e o mesmo runtime
(Electron 42.3.0 / Node 24.15.0). A PRD alinha `engines.node`, `@types/node` e o
`target` do esbuild, e prepara o terreno para a PRD-95 (ESM + ES2024).

## 2. Contexto e problema

### 2.1 O piso atual está um LTS atrás do host

Hoje `engines.vscode` é `^1.101.0` (Node 22.15.0, Electron 35). O Node 22 continua
LTS até abril/2027, mas o host do VS Code já migrou:

| VS Code | Data | Electron | Node do host |
|---|---|---|---|
| 1.122.1 | 2026-05-28 | 39.8.8 | 22.22.1 |
| **1.123.0** | **2026-06-03** | **42.3.0** | **24.15.0** |
| 1.124.0 | 2026-06-10 | 42.3.0 | 24.15.0 |
| **1.125.0** | **2026-06-17** | **42.3.0** | **24.15.0** |
| 1.144.0 | 2026-10-28 | 43.8.3 | 24.22.1 |

O Node 24 é o LTS atual (EOL abril/2028) e é o runtime real da extensão em
qualquer VS Code ≥ 1.123. Manter `engines.node >=22` e `@types/node ^22` faz o
compilador tipar por um runtime que já não é o host mínimo.

### 2.2 Por que 1.125 e não 1.123

O `@types/vscode` não é publicado em toda release. A série em volta é:

- `1.120.0` — existe;
- `1.123.0` / `1.124.0` — **não existem** no npm;
- `1.125.0` — existe.

Como o `docs-fidelity` exige `@types/vscode` **exatamente** igual ao piso, usar
`^1.123.0` quebraria a regra ou exigiria tipos mais antigos (1.120) e um
relaxamento do contrato. A 1.125 é o primeiro piso publicável com Node 24, custa
duas semanas de alcance e preserva o invariante. A 1.123 fica registrada como a
primeira release com Node 24, mas o piso efetivo é 1.125.

### 2.3 O que muda na prática

- O compilador passa a enxergar as APIs do VS Code até 1.125 (sem usar nada acima
  do piso).
- O `engines.node` passa a refletir o host mínimo (Node 24) e o esbuild deixa de
  mirar `node22`.
- A PRD-95 pode adotar ESM (`.mjs`) e ES2024 sem violar o runtime.
- Usuários em VS Code < 1.125 deixam de instalar a extensão; é uma mudança
  **breaking** de plataforma, comunicada no README/CHANGELOG.

### 2.4 Baseline

- Bundle CJS `dist/extension.js`: **921 KB** (0.18.0).
- Cobertura: 97/93/97 (linhas/branches/funções) no `.c8rc`.
- `@types/node` 24.15.0 não existe; a linha 24 tem 24.13.6 e 24.19.2.

## 3. Objetivos / Não-objetivos

**Objetivos**
- `engines.vscode` → **`^1.125.0`** e `@types/vscode` → **`1.125.0`** (exato).
- `engines.node` → **`>=24.0.0`**, `@types/node` → **`^24.19.0`** e esbuild
  `target: 'node24'`.
- Atualizar `VSCODE_HOST_NODE` no `docs-fidelity` com `'1.125': 24` e os testes.
- Atualizar README ×24, wiki, site, `CONTRIBUTING.md`, NFR-002/003,
  TPL-VSCODE-API e BR-PLAT-001.
- Validar o floor no VS Code **1.125.0** (integração/smoke + VSIX) e no stable
  atual.

**Não-objetivos**
- Migrar para ESM/ES2024 ou trocar o `tsconfig` — escopo da PRD-95.
- Adotar APIs novas de 1.121–1.125 (só o piso; uso é incremental).
- Mudar settings, comandos, comportamento de execução ou suporte Oracle.
- Trocar `c8`, `@vscode/test-cli` ou o harness de testes.
- Suportar VS Code < 1.125.

## 4. Requisitos

### RF1 — Piso e tipos exatos

`package.json`: `engines.vscode: "^1.125.0"` e
`devDependencies["@types/vscode"]: "1.125.0"` (sem caret). O `docs-fidelity`
continua exigindo a igualdade exata.

### RF2 — Runtime Node 24

`engines.node: ">=24.0.0"`; `@types/node: "^24.19.0"`; `esbuild.config.mjs` com
`target: 'node24'`. O `docs-fidelity` passa a mapear `1.125 → 24` e reprova
qualquer divergência de major.

### RF3 — Documentação e governança

- `docs-fidelity`: adicionar `'1.125': 24` (e, se útil, `'1.123': 24` como
  referência histórica) em `VSCODE_HOST_NODE`.
- README (nota do vault + 23 variantes): `VS Code 1.125+ (Node 24)`.
- Wiki `Home` e `Installation-and-requirements`; site landing page;
  `CONTRIBUTING.md`.
- `NFR-002` (Node), `NFR-003` (VS Code), `TPL-VSCODE-API` (tabela e inventário) e
  `BR-PLAT-001` (piso/referências).
- `CHANGELOG.md`: seção `## 0.19.0` com a mudança breaking de plataforma.

### RF4 — Validação no floor

- Unitários/cobertura em Node 24 e 26.
- Integração `smoke` no VS Code **1.125.0** (via `@vscode/test-cli` com
  `version: '1.125.0'`) e no stable atual, com Oracle quando disponível.
- `npm run package` + instalação do `.vsix` no 1.125 e no stable; extensão ativa,
  Test Explorer popula e CodeLens funciona.
- Nenhuma API acima do piso: o `@types/vscode` 1.125 é o contrato.

**Não-funcionais**
- RNF1 — Nenhuma mudança de comportamento observável (settings/comandos/API).
- RNF2 — Bundle CJS continua ≤ 921 KB (a PRD-95 pode reduzi-lo).
- RNF3 — Cobertura mantém os thresholds do `.c8rc` (97/93/97).
- RNF4 — `docs:check`, `docs:fidelity`, `brain:ci` e `version:check` verdes.

## 5. Solução proposta

1. Atualizar `package.json` (engines, types), `esbuild.config.mjs` e o mapa do
   `docs-fidelity`.
2. Atualizar os fixtures de `docsFidelity.test.ts`/`brainScripts.test.ts` para
   1.125/24.
3. Atualizar a documentação no vault e rodar `brain:sync` + `brain:build`.
4. Validar no 1.125 e no stable; empacotar o VSIX.
5. Merge na 0.19.0; a PRD-95 vem em seguida para ESM/ES2024.

Decisão de design: **não** usar `@types/vscode@1.120.0` com piso 1.123. O
compilador ficaria cego para as APIs de 1.121–1.123 e a regra precisaria ser
relaxada; a diferença de duas semanas não justifica.

## 6. Configuração

Nenhuma setting/comando novo. A mudança é de plataforma/build.

## 7. Plano de testes

- **Unitários**: `docsFidelity.test.ts` cobrindo o mapa 1.125 → 24 e a igualdade
  `@types/vscode`; `brainScripts.test.ts` com o fixture atualizado; `test:unit` e
  `test:coverage` verdes.
- **Integração**: `smoke` no 1.125 e no stable, com/ sem Oracle conforme `.env`;
  multiroot não muda.
- **Packaging**: `npm run package`; instalar o `.vsix` no 1.125 e no stable.
- **Manual**: abrir workspace com `.pks`, conferir árvore/CodeLens/execução;
  confirmar que a versão antiga (<1.125) é recusada pelo Marketplace/host.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `@types/vscode@1.123.0` não existe | Piso 1.125 (primeiro publicável); 1.123 documentada como referência de runtime |
| Usuários em VS Code < 1.125 não instalam | Breaking documentado no README/CHANGELOG; stable é semanal e auto-atualiza |
| `@types/node` 24.19 > host 24.15 | Tipos só para o major; opção de pinar `24.13.6` se houver rigor de minor |
| Docs espalhadas (24 READMEs + wiki/site) | Editar a nota canônica e regenerar; `docs:check`/`brain:ci` no CI |
| API acima do piso | `@types/vscode` exato + `docs-fidelity`; revisão de PR |
| Regressão de runtime no floor | Smoke no 1.125 + stable; unitários em 24/26 |

## 9. Rollout

- **Release alvo:** 0.19.0.
- **Breaking:** `engines.vscode ^1.125.0`; entrada destacada no `CHANGELOG`.
- Atualizar README/wikis/site na mesma entrega; publicar via release do GitHub.
- A PRD-95 (ESM/ES2024) entra na sequência, sem mudar o piso.

## 10. Critérios de aceite

- `package.json`: `engines.vscode ^1.125.0`, `@types/vscode 1.125.0`,
  `engines.node >=24.0.0`, `@types/node ^24.19.0`; esbuild `target node24`.
- `docs-fidelity` mapeia 1.125 → 24 e passa; fixtures atualizados.
- README ×24, wiki, site, CONTRIBUTING, NFR-002/003, TPL-VSCODE-API e
  BR-PLAT-001 atualizados.
- `compile`, `lint`, `typecheck`, `test:unit`, `test:coverage` verdes em 24 e 26.
- Integração smoke e VSIX validados no 1.125 e no stable.
- `docs:check`, `docs:fidelity`, `brain:ci`, `version:check` verdes.
- Nenhuma referência stale a `1.101`/`Node 22` nos artefatos gerados.

## 11. Questões em aberto

- `@types/node`: `^24.19.0` (padrão atual, tipos à frente do host) ou pin
  `24.13.6` (mais conservador)?
- Vale manter `1.123` explicitamente no mapa `VSCODE_HOST_NODE` como referência
  histórica, ou só o piso efetivo?
- O job de integração no floor roda no CI (com Oracle) ou fica local?

## 12. Impacto no cérebro

Atualizar **`BR-PLAT-001`** (piso 1.125, `prds: ["PRD-94", "PRD-127"]`,
`requisitos` de RF1/RF2 e `implementacao` do `docs-fidelity`), **`NFR-002`**
(`engines.node >=24`, `.nvmrc` 24, CI 24/26), **`NFR-003`** (piso 1.125) e
**`TPL-VSCODE-API`** (tabela/runtime). Nenhuma regra nova; a PRD-95 cria a regra
de ESM.

RNFs sem regra: RNF1/RNF3 (cobertos por testes), RNF2 (medição de bundle) e RNF4
(pipeline de docs).

## Impacto nas docs

`CHANGELOG` (0.19.0, breaking de plataforma), `README` ×24 (VS Code 1.125+ /
Node 24), `wiki/Home.md`, `wiki/Installation-and-requirements.md`, site e
`CONTRIBUTING.md`. Cada superfície cita `PRD-127` ou `<!-- prd:PRD-127 -->` na
conclusão.
