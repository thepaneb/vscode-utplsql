---
tipo: prd
id: PRD-127
aliases: [PRD-127]
status: approved
titulo: "Piso de VS Code 1.125 e runtime Node 24"
versao: "0.19.0"
data: "2026-10-30"
autor: "Gil Cleber Barboza"
versao_titulo: "0.19.0 — Piso Node 24 e runtime moderno"
verificado: "2026-10-31"
regras: []
docs: ["CHANGELOG", "README", "wiki/Home.md", "wiki/Installation-and-requirements.md", "functional/10-development-tooling.md"]
tags: [prd]
---

# PRD-127 — Piso de VS Code 1.125 e runtime Node 24

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` (piso de plataforma e runtime) |
| Versão alvo | 0.19.0 |
| Arquivos afetados | `package.json`, `esbuild.config.mjs`, `scripts/docs-fidelity.cjs`, `src/**/*.ts`, `scripts/**/*.cjs`, `src/test/unit/docsFidelity.test.ts`, `src/test/unit/brainScripts.test.ts`, `docs/brain/14-NFR/NFR-002*.md`, `docs/brain/14-NFR/NFR-003*.md`, `docs/brain/15-Regras/BR-PLAT-001*.md`, `docs/brain/17-Componentes/TPL-VSCODE-API*.md`, `docs/brain/17-Componentes/TPL-ESBUILD*.md`, `docs/brain/11-Stack/{DEP-esbuild,DEP-typescript}.md`, `docs/brain/10-Projeto/Funcional/10-development-tooling.md`, `docs/brain/60-README/README (extensão).md` (+ 23 variantes geradas), `docs/brain/70-Wiki/{Home,Installation-and-requirements}.md`, `docs/brain/80-Site/Landing page (site).md`, `CONTRIBUTING.md`, `CHANGELOG.md` |
| Esforço estimado | 3–5 dias |
| Complexidade | Média-Alta |
| Relaciona-se a | PRD-94 (piso anterior), PRD-95 (ESM/ES2024), PRD-47 (toolchain), PRD-120 (ativação), NFR-002, NFR-003, BR-PLAT-001 |

## 1. Resumo

Subir o piso de `engines.vscode` de `^1.101.0` para **`^1.125.0`** — o primeiro
stable com **Node 24.15.0** no Extension Host que também tem **`@types/vscode`
publicado**. A 1.123 é a primeira stable com Node 24, mas as tags 1.123/1.124 não
têm tipos no npm; a 1.125 mantém a regra `@types/vscode == piso` e o mesmo runtime
(Electron 42.3.0 / Node 24.15.0). A PRD alinha `engines.node`, `@types/node` e o
`target` do esbuild, e prepara o terreno para a PRD-95 (ESM + ES2024). Além do
piso, faz uma **auditoria dirigida de compatibilidade e otimização para o Node
24**, para que o código não apenas rode no runtime novo, mas use as APIs e os
idiomas esperados para ele.

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

- Bundle CJS `dist/extension.js`: **942.777 bytes** = **920,7 KiB** (0.18.0).
- Cobertura: 97/93/97 (linhas/branches/funções) no `.c8rc`; baseline medido
  **97,97/93,77/97,77** (margem curta).
- `@types/node` 24.15.0 não existe; a linha 24 tem 24.13.6 e 24.19.2.

### 2.5 Decisões de revisão (2026-10-31)

- **`@types/node`**: adotar **`^24.19.0`** (24.19.2 na instalação), porque não
  existe `24.15.x` e a série 24.19 é a mais próxima do host; o `docs-fidelity`
  compara só o major. A alternativa `24.13.6` fica descartada por ficar atrás do
  host e esconder APIs disponíveis em runtime.
- **Mapa do `docs-fidelity`**: adicionar apenas **`'1.125': 24`**; a 1.123 fica
  documentada como referência histórica na tabela, não no mapa (evita manter
  uma entrada que ninguém usa).
- **PRD-47 no mesmo PR**: `engines.node >=24` e a saída do Node 22 do CI são a
  mesma mudança de plataforma; separá-las deixaria a matriz testando um runtime
  que o manifesto não promete.
- **Validação no floor**: `@vscode/test-cli` aceita `--code-version`; o smoke
  roda com `--code-version 1.125.0` (sem criar config nova).
- **Bundle**: o teto é **942.777 bytes** (o “921 KB” anterior era KiB).
- **Refs da `BR-PLAT-001`**: as linhas `package.json:822/824` estão stale
  (os tipos estão em `:1022/:1024`); corrigir na conclusão.

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
- Auditar `src/`, `scripts/` e testes contra a documentação oficial do Node 24
  (APIs depreciadas/removidas, idiomas e recursos estáveis), corrigindo o que for
  seguro e registrando o que pertence à PRD-95 ou a uma PRD própria.

**Não-objetivos**
- Migrar para ESM/ES2024 ou trocar o `tsconfig` — escopo da PRD-95.
- Adotar APIs novas de 1.121–1.125 (só o piso; uso é incremental).
- Mudar settings, comandos, comportamento de execução ou suporte Oracle.
- Trocar `c8`, `@vscode/test-cli` ou o harness de testes.
- Suportar VS Code < 1.125.
- Reescrever código por estilo ou fazer otimizações especulativas sem medição;
  a auditoria só corrige itens de baixo risco e com ganho demonstrável.

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
  `CONTRIBUTING.md`; `functional/10-development-tooling.md`.
- `NFR-002` (Node), `NFR-003` (VS Code), `TPL-VSCODE-API` (tabela e inventário),
  `TPL-ESBUILD`/`DEP-esbuild`/`DEP-typescript` (target `node24`) e
  `BR-PLAT-001` (piso/referências corrigidas).
- `CHANGELOG.md`: seção `## 0.19.0` com a mudança breaking de plataforma.

### RF4 — Validação no floor

- Unitários/cobertura em Node 24 e 26.
- Integração `smoke` no VS Code **1.125.0** (via
  `npx vscode-test --config .vscode-test.smoke.mjs --code-version 1.125.0`) e no
  stable atual, com Oracle quando disponível.
- `npm run package` + instalação do `.vsix` no 1.125 e no stable; extensão ativa,
  Test Explorer popula e CodeLens funciona.
- Nenhuma API acima do piso: o `@types/vscode` 1.125 é o contrato.

### RF5 — Auditoria de compatibilidade e otimização para Node 24

Antes de fechar a PRD, revisar o código com a **documentação oficial do Node 24**
(API docs, release notes e guia de deprecações) e com `@types/node` 24 como
referência. O objetivo é que, ao fim da 0.19.0, o código esteja aderente às APIs e
aos idiomas esperados para o Node 24, sem padrões depreciados e sem regressão
observável.

- **Checklist versionado** (registrar no relatório da PRD):
  - APIs removidas/depreciadas no Node 24 (ex.: `url.parse`, `punycode`,
    `new Buffer`, `fs.exists`, callbacks legados) e equivalentes já obsoletos no
    Node 22;
  - prefixo `node:` em todos os imports de builtins (`fs`, `path`, `os`,
    `crypto`, `child_process`, `stream`, `util`, `timers`, `url`);
  - flags/APIs experimentais que possam ser trocadas por equivalentes estáveis;
  - recursos nativos do Node 24 aplicáveis: identificar e, quando trivial e sem
    duplicar a PRD-95, aplicar (`fetch`, `AbortSignal`, `timers/promises`,
    `structuredClone`, `Promise.withResolvers`, `Object.groupBy`/`Map.groupBy`,
    `.at()`/`.toSorted()`); a adoção ampla continua na PRD-95;
  - padrões de I/O e concorrência (sync vs async, streams/backpressure,
    timeouts/cancelamento) com ganho mensurável;
  - uso de `process`/`global`/`__dirname` compatível com o runtime e com o
    bundle; nada de API que o Extension Host não exponha.
- **Correções no escopo:** aplicar o que for de baixo risco e sem mudança
  observável (RNF1); cada item que afete performance deve ter medição
  antes/depois.
- **Adiamentos:** itens que exijam ESM/ES2024 ou refatoração ampla entram numa
  lista priorizada para a PRD-95 (ou PRD própria), com justificativa.
- **Relatório:** seção “Auditoria Node 24” na PRD (ou nota em `11-Stack`
  referenciada por ela) com achados, arquivos, decisão (`feito`/`adiado`) e
  medição.
- **Sem regressão:** nenhum uso novo de API depreciada; exceções precisam de
  justificativa e prazo.

**Não-funcionais**
- RNF1 — Nenhuma mudança de comportamento observável (settings/comandos/API).
- RNF2 — Bundle CJS continua ≤ **942.777 bytes** (920,7 KiB; a PRD-95 pode
  reduzi-lo).
- RNF3 — Cobertura mantém os thresholds do `.c8rc` (97/93/97).
- RNF4 — `docs:check`, `docs:fidelity`, `brain:ci` e `version:check` verdes.
- RNF5 — Nenhuma regressão de performance nas fases medidas; qualquer
  otimização entra com comparação antes/depois documentada.

## 5. Solução proposta

1. Atualizar `package.json` (engines, types), `esbuild.config.mjs` e o mapa do
   `docs-fidelity`.
2. Executar a auditoria Node 24 (RF5) com a documentação oficial e `@types/node`
   24; aplicar as correções de baixo risco e registrar a lista de adiados.
3. Atualizar os fixtures de `docsFidelity.test.ts`/`brainScripts.test.ts` para
   1.125/24.
4. Atualizar a documentação no vault e rodar `brain:sync` + `brain:build`.
5. Validar no 1.125 e no stable; empacotar o VSIX.
6. Merge na 0.19.0; a PRD-95 vem em seguida para ESM/ES2024 e para os itens
   adiados pela auditoria.

Decisão de design: **não** usar `@types/vscode@1.120.0` com piso 1.123. O
compilador ficaria cego para as APIs de 1.121–1.123 e a regra precisaria ser
relaxada; a diferença de duas semanas não justifica.

## 6. Configuração

Nenhuma setting/comando novo. A mudança é de plataforma/build.

## 7. Plano de testes

- **Unitários**: `docsFidelity.test.ts` cobrindo o mapa 1.125 → 24 e a igualdade
  `@types/vscode`; `brainScripts.test.ts` com o fixture atualizado; `test:unit` e
  `test:coverage` verdes.
- **Auditoria Node 24**: revisão do checklist da RF5 (APIs depreciadas, `node:`,
  experimental → estável, I/O/concorrência); relatório com achados e decisão;
  `compile`/`lint` verdes e nenhuma API acima do piso.
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
| Auditoria Node 24 virar reescrita | RF5 limitada a itens de baixo risco; o resto vira lista priorizada para a PRD-95/PRD própria |
| “Otimização” sem ganho real | RNF5 exige medição antes/depois e comportamento observável idêntico |
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
- Auditoria Node 24 (RF5) concluída: checklist preenchido, achados e decisões
  registrados, sem APIs depreciadas/experimentais sem justificativa e imports de
  builtins com prefixo `node:`.
- Otimizações aplicadas com medição antes/depois e sem mudança observável.
- `compile`, `lint`, `typecheck`, `test:unit`, `test:coverage` verdes em 24 e 26.
- Integração smoke e VSIX validados no 1.125 e no stable.
- `docs:check`, `docs:fidelity`, `brain:ci`, `version:check` verdes.
- Nenhuma referência stale a `1.101`/`Node 22` nos artefatos gerados.

## 11. Questões em aberto

- ~~`@types/node`: `^24.19.0` ou `24.13.6`?~~ **Decidido (2026-10-31):**
  `^24.19.0` (não existe 24.15.x; o `docs-fidelity` compara major).
- ~~Vale manter `1.123` no mapa `VSCODE_HOST_NODE`?~~ **Decidido:** só o piso
  efetivo `1.125`; a 1.123 fica na tabela histórica.
- O job de integração no floor roda no CI (com Oracle) ou fica local? **Proposta:**
  local/opcional no CI, porque o `@vscode/test-electron` baixa o build 1.125 e o
  Oracle já é coberto pela matriz.
- O relatório da auditoria Node 24 fica como seção desta PRD ou em nota própria
  em `11-Stack`?
- Alguma otimização de I/O deve ser medida junto da PRD-102 (observabilidade)
  por compartilhar a instrumentação de fases?

## 12. Impacto no cérebro

Atualizar **`BR-PLAT-001`** (piso 1.125, `prds: ["PRD-94", "PRD-127"]`,
`requisitos` de RF1/RF2, `implementacao` do `docs-fidelity` e as linhas reais do
`package.json`), **`NFR-002`** (`engines.node >=24`, `.nvmrc` 24, CI 24/26,
auditoria de compatibilidade), **`NFR-003`** (piso 1.125),
**`TPL-VSCODE-API`** (tabela/runtime), **`TPL-ESBUILD`**/`DEP-esbuild`/
`DEP-typescript` (target `node24`) e `functional/10-development-tooling.md`.
Nenhuma regra nova; a PRD-95 cria a regra de ESM (`BR-PLAT-005`).

RNFs sem regra: RNF1/RNF3 (cobertos por testes), RNF2 (medição de bundle) e RNF4
(pipeline de docs).

## Impacto nas docs

`CHANGELOG` (0.19.0, breaking de plataforma), `README` ×24 (VS Code 1.125+ /
Node 24), `wiki/Home.md`, `wiki/Installation-and-requirements.md`, site e
`CONTRIBUTING.md`. Cada superfície cita `PRD-127` ou `<!-- prd:PRD-127 -->` na
conclusão. O relatório da auditoria Node 24 (RF5) fica na PRD ou em nota de
`11-Stack` referenciada por ela, com o checklist e os itens adiados.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-47-node-26-toolchain|PRD-47]] · [[prd-94-vscode-floor-1-101|PRD-94]] · [[prd-95-esm-es2023-node22|PRD-95]] · [[prd-102-trace-and-perf-instrumentation|PRD-102]] · [[prd-120-lean-activation-lazy-setup|PRD-120]]
- 🔗 Mesma versão (0.19.0): [[prd-47-node-26-toolchain|PRD-47]] · [[prd-95-esm-es2023-node22|PRD-95]] · [[prd-111-decompose-oracle-runner|PRD-111]] · [[prd-124-oracledb-26-upgrade|PRD-124]] · [[prd-125-thick-full-matrix-ci|PRD-125]]
- 🚀 ⬅️ release anterior: [[prd-123-oracle-11g-support|PRD-123 (0.18.0)]] · ➡️ próxima release: [[prd-101-connection-pool-lifecycle|PRD-101 (0.20.0)]]
<!-- brain:auto:end -->
