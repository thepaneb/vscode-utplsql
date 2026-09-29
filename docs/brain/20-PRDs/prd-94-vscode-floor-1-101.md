---
tipo: prd
id: PRD-94
aliases: [PRD-94]
status: completed
titulo: "Piso de VS Code 1.101 e runtime Node 22"
versao: "0.14.0"
data: "2026-09-29"
autor: "Gil Cleber Barboza"
verificado: 2026-09-29
regras: ["BR-PLAT-001"]
tags: [prd]
---

# PRD-94 — Piso de VS Code 1.101 e runtime Node 22

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.14.0 |
| Arquivos afetados | `package.json`, `esbuild.config.mjs`, `scripts/docs-fidelity.cjs`, `src/test/unit/docsFidelity.test.ts`, `docs/brain/14-NFR/NFR-003`, `docs/brain/17-Componentes/TPL-VSCODE-API`, `docs/brain/60-README/*`, `docs/brain/70-Wiki/Installation-and-requirements.md`, `CHANGELOG.md` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |

## 1. Resumo

Subir o piso de `engines.vscode` de `^1.88.0` para **`^1.101.0`** — o primeiro VS
Code cujo Extension Host embute **Node 22** (`.nvmrc` da tag `1.101.0`). O runtime
da extensão é o **Node do VS Code**, não o do dev/CI; com isso `engines.node`/
`@types/node` (22) e o `esbuild target` deixam de estar "à frente" do host. O
`docs-fidelity` passa a cobrar a coerência.

## 2. Contexto e problema

- **1.88 = Electron 28 = Node 18.18**, **EOL desde abr/2025** (release notes
  oficiais do VS Code/Electron). O piso declarado rodava um Node sem suporte.
- `@types/node ^22` fazia o `tsc` aceitar APIs que **não existem** no Node 18 do
  host (mesma armadilha do `@types/vscode` solto).
- `esbuild target: node20` declarava um alvo acima do host real.
- VS Code **1.100 = Node 20.19**; **1.101 = Node 22.15** (verificado no `.nvmrc`
  do repositório do VS Code por tag). Node 22 é o **LTS mais antigo em suporte**
  (EOL abr/2027).

## 3. Objetivos / Não-objetivos

**Objetivos**
- `engines.vscode ^1.101.0`, casando o runtime com o **Node 22 LTS**.
- Alinhar `engines.node`, `@types/node` e `esbuild target` ao Node do host.
- Checagem no `docs-fidelity` que **impede divergência** entre piso, Node do host
  e esses três valores.

**Não-objetivos**
- Não adota API nova de VS Code nem de Node (o inventário segue ES2021 + módulos
  estáveis).
- Não muda a **matriz de bancos** nem os recursos (a Test Coverage API existe
  desde 1.88).

## 4. Requisitos

### RF1 — Piso de VS Code

`engines.vscode` = `^1.101.0`; `@types/vscode` pinado exatamente em `1.101.0`.

### RF2 — Coerência de runtime

`engines.node`, `@types/node` e `esbuild target` devem casar com o Node do host
do piso (mapa **VS Code → Node**), validado por `docs-fidelity`.

### RF3 — Documentação fiel

`NFR-003` e `TPL-VSCODE-API` descrevem o piso, o runtime e a tabela VS Code →
Node; README (23 variantes) e wiki passam a exigir **VSCode 1.101+**.

**Não-funcionais**
- RNF1 — Usuários deixam de rodar em Node EOL.
- RNF2 — Nenhuma API acima do piso é aceita pelo compilador.

## 5. Solução proposta

- `package.json`: `engines.vscode ^1.101.0`, `@types/vscode 1.101.0` (os demais
  já eram 22).
- `esbuild.config.mjs`: `target: 'node22'`.
- `docs-fidelity`: mapa `VSCODE_HOST_NODE` + checagem de `@types/vscode == piso`,
  `engines.node`/`@types/node`/`esbuild target` == Node do host.

## 6. Configuração

Mudança de manifesto (`engines`); nenhuma setting de usuário nova.

## 7. Plano de testes

- **Unitários**: `docsFidelity.test.ts` — piso × types, `engines.node`, `@types/node`
  e `esbuild target` (4 cenários).
- **Typecheck**: `tsc --noEmit` contra `@types/vscode@1.101.0` (0 erros).
- **Integração**: `.vscode-test` passa a baixar o VS Code 1.101 (mantido verde).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| **Breaking** para VS Code 1.88–1.100 | Registrado no `CHANGELOG`; trade-off aceito (Node 18/20 EOL) |
| Regressão futura ao subir um valor isolado | `docs-fidelity` bloqueia divergência; mapa VS Code→Node no vault |
| Mapa ficar defasado em VS Code novo | Tabela em `TPL-VSCODE-API`; atualizar o mapa ao subir o piso |

## 9. Rollout

- Release alvo: **0.14.0** (branch `release/v0.14.0`).
- Bullet no `CHANGELOG.md`; `NFR-003`, `TPL-VSCODE-API`, README/wiki atualizados.

## 10. Critérios de aceite

- `engines.vscode ^1.101.0` e `@types/vscode 1.101.0`.
- `tsc --noEmit` verde com os tipos do piso.
- `docs:check`/`docs:fidelity` verdes, com a checagem de coerência ativa.
- README/wiki exigindo VSCode 1.101+.

## 11. Questões em aberto

- Revisitar o piso quando o Node 24 virar o LTS mais antigo (aprox. 2028).

## 12. Impacto no cérebro

Criada a regra **`BR-PLAT-001`** (piso de VS Code e runtime Node coerentes), com
`prds: ["PRD-94"]`; `NFR-003` e `TPL-VSCODE-API` atualizados.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 📐 Regras: [[BR-PLAT-001 - Piso de VS Code e runtime Node do host sao coerentes|BR-PLAT-001]]
- 🎯 RF1 — Piso de VS Code → [[BR-PLAT-001 - Piso de VS Code e runtime Node do host sao coerentes|BR-PLAT-001]]
- 🎯 RF2 — Coerência de runtime → [[BR-PLAT-001 - Piso de VS Code e runtime Node do host sao coerentes|BR-PLAT-001]]
- 🚀 ⬅️ release anterior: [[prd-87-suitepath-results-jump|PRD-87 (0.13.0)]] · ➡️ próxima release: [[prd-47-node-26-toolchain|PRD-47 (0.15.0)]]
<!-- brain:auto:end -->
