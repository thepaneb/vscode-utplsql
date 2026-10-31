---
tipo: prd
id: PRD-47
aliases: [PRD-47]
status: completed
titulo: "Node 24 no toolchain e Node 26 no CI"
versao: "0.19.0"
data: "2026-08-29"
autor: "Gil Cleber"
versao_titulo: "0.19.0 — Piso Node 24 e runtime moderno"
verificado: "2026-10-31"
regras: []
docs: ["CHANGELOG", "wiki/Contributing.md", "functional/10-development-tooling.md"]
tags: [prd]
---

# PRD-47 — Node 24 no toolchain e Node 26 no CI

| Campo | Valor |
|---|---|
| Autor | Gil Cleber |
| Data | 2026-08-29 |
| Componente | Extensão `paneb.vscode-utplsql` (toolchain de desenvolvimento) |
| Versão alvo | 0.19.0 |
| Arquivos afetados | `.nvmrc`, `.github/workflows/ci.yml`, `docs/brain/10-Projeto/Funcional/10-development-tooling.md`, `docs/brain/70-Wiki/Contributing.md`, `CHANGELOG.md` |
| Esforço estimado | 0,5 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-127 (piso Node 24), PRD-18 (engines/CI), PRD-95 (runtime) |

## 1. Resumo

Manter o **Node 24** como toolchain de desenvolvimento (`.nvmrc` 24) e cobrir o
**Node 26 LTS** na matrix do CI. O Node 26 entrou em LTS em outubro/2026 e já pode
ser validado, mas o projeto **não** troca o `.nvmrc`: o 24 é o runtime do host
(PRD-127) e a fonte local; o 26 entra como eixo de compatibilidade do toolchain.
`engines.node` e `@types/node` passam a `>=24`/`^24` pela PRD-127 — não por esta
PRD.

> **Reescopo em 2026-10-30:** a versão original previa `.nvmrc` → 26 após o LTS.
> A decisão de plataforma foi manter o host e o toolchain local em **24** e testar
> o **26** no CI. A PRD-47 passa a cobrir essa política, sem duplicar o piso de
> runtime da PRD-127.

## 2. Contexto e problema

São dois runtimes distintos no projeto:

- **Runtime da extensão** = Node embutido no VS Code (Extension Host). Com o piso
  em VS Code 1.125 (PRD-127), o host é **Node 24.15.0**. `engines.node >=24`,
  `@types/node ^24` e o target `node24` vêm da PRD-127.
- **Toolchain de desenvolvimento** = Node da máquina do dev/CI (`.nvmrc` + matrix).
  Hoje `.nvmrc` é **24** e a matrix é `[22, 24, 26]`; o Node 22 não é mais o host
  mínimo e pode sair. O Node 26 já é LTS (out/2026), mas adotá-lo no `.nvmrc`
  criaria churn sem ganho de runtime — o host continua 24.

O 26 na matrix garante que scripts, testes e ferramentas continuem funcionando na
próxima LTS sem obrigar todos os devs a migrar agora. A decisão também evita o
desalinhamento entre o Node local e o runtime real da extensão.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Manter `.nvmrc` em **24** (fonte local).
- CI matrix → **`[24, 26]`** (remover o 22; manter o 24 e adicionar/validar o 26).
- Validar `npm test`/`npm run test:coverage` no Node 26.
- Atualizar docs de desenvolvimento e CHANGELOG.

**Não-objetivos**
- `.nvmrc` → 26 (decisão: manter 24).
- Mudar `engines.node`/`@types/node`/piso do VS Code — escopo da PRD-127.
- Mudanças de código para APIs exclusivas do Node 26.
- Mudar o runtime do bundle (a PRD-95 trata de ESM/ES2024).

## 4. Requisitos

### RF1 — `.nvmrc` permanece 24

`.nvmrc` já aponta para **`24`** (estado da 0.18.0); não há mudança de arquivo.
A decisão é explícita: o Node 24 é o runtime do host (VS Code 1.125) e o
baseline de desenvolvimento; o Node 26 não substitui o `.nvmrc` nesta versão.

### RF2 — CI matrix `[24, 26]`

`.github/workflows/ci.yml`: `node-version: [24, 26]`. `npm test` (que dispara
`pretest:unit` com compile + lint) e `npm run test:coverage` devem passar nos dois.
O Node 22 sai da matrix **no mesmo PR da PRD-127**, porque deixou de ser o host
mínimo (`engines.node >=24`). Para não duplicar custo, os passos de
`audit:prod`, `version:check`, `brain:ci` + `git diff --exit-code`,
`docs:check` e `docs:features-check` rodam só no Node 24
(`if: matrix.node-version == 24`); `lint`, `typecheck` e `test:coverage` rodam
nos dois.

### RF3 — Docs e CHANGELOG

- `docs/brain/10-Projeto/Funcional/10-development-tooling.md`: Node 24 local,
  matrix 24/26, Node 22 fora; passos de docs/brain/audit só no 24.
- `docs/brain/70-Wiki/Contributing.md`: requisito local e matrix.
- `CHANGELOG.md`: entrada na 0.19.0.
- `NFR-002` é atualizado pela PRD-127 (fonte da verdade do runtime); esta PRD
  apenas reflete o toolchain.

**Não-funcionais**
- RNF1 — Suíte unitária e cobertura verdes no Node 24 e no 26.
- RNF2 — VSIX inalterado (é só toolchain; o bundle não muda nesta PRD).
- RNF3 — Nenhuma dependência nova.
- RNF4 — CI não ganha um terceiro eixo (o custo cai em relação a 22/24/26); os
  passos de documentação/auditoria rodam em um único job (24).

## 5. Solução proposta

```sh
# .nvmrc → 24 (sem mudança)
# .github/workflows/ci.yml → node-version: [24, 26]
nvm use 24
npm test
npm run test:coverage
```

No CI, a matrix roda 24 e 26; `docs`/`brain`/`audit` podem rodar em um único job
(24) para não duplicar custo. Validar o Node 26 localmente é opcional, mas
recomendado antes do merge.

## 6. Configuração

Nenhuma setting/comando novo.

## 7. Plano de testes

- **Unitários**: `npm test` e `npm run test:coverage` no 24 (local) e no 26 (CI).
- **Integração**: opcional no 26; a matriz Oracle não depende da versão do dev.
- **Manual**: `npm run package` no 24; conferir que o VSIX não mudou.
- **CI**: matrix `[24, 26]` verde no push/PR.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Node 26 quebra um script/teste do toolchain | Matrix 26 no CI desde já; corrigir sem mudar o runtime do bundle |
| Devs em Node 22 (fora do `.nvmrc`) | `.nvmrc` 24 + `engines.node >=24` (PRD-127); aviso no docs |
| Divergência entre host (24) e dev (26) | `.nvmrc` continua 24; o 26 é só eixo de CI |
| Custo de CI com 26 | Matrix 24/26 (2 jobs), menos que a atual 22/24/26 |

## 9. Rollout

- **Release alvo:** 0.19.0.
- Entrada no `CHANGELOG.md` (toolchain; sem impacto no usuário).
- Reavaliar `.nvmrc` 26 em versão futura se o host/equipe migrarem.

## 10. Critérios de aceite

- [ ] `.nvmrc` = `24`.
- [ ] CI matrix = `[24, 26]`.
- [ ] `npm test` e `npm run test:coverage` verdes no 24 e no 26.
- [ ] Docs de desenvolvimento e CHANGELOG atualizados.
- [ ] `engines.node >=24` e `@types/node ^24` entregues pela PRD-127.
- [ ] Nenhuma mudança no conteúdo do VSIX.

## 11. Questões em aberto

- Migrar o `.nvmrc` para 26 em alguma versão futura ou manter 24 enquanto o host
  for 24?
- O Node 26 deve rodar a suíte completa ou só unitários no CI?
- Vale um job noturno no 26 para detectar regressões de toolchain mais cedo?

## 12. Impacto no cérebro

Nenhuma regra nova. Atualizar **`NFR-002`** (toolchain 24, CI 24/26) na conclusão;
a **`BR-PLAT-001`** já é atualizada pela PRD-127 (piso/runtime). RNFs sem regra:
RNF1 (suíte), RNF2 (VSIX), RNF3 (sem dep), RNF4 (custo de CI).

nenhuma

RNFs sem regra: RNF1, RNF2, RNF3, RNF4.

## Impacto nas docs

`docs/functional/10-development-tooling.md` e `wiki/Contributing.md` passam a
descrever Node 24 local + matrix 24/26; `CHANGELOG` registra na 0.19.0. Na
conclusão, cada superfície cita `PRD-47` ou `<!-- prd:PRD-47 -->`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-18-engine-node-ci|PRD-18]] · [[prd-95-esm-es2023-node22|PRD-95]] · [[prd-127-vscode-floor-1-125|PRD-127]]
- ⚙️ Pipelines: [[PIPE-ci - CI|PIPE-ci]]
- 🔗 Mesma versão (0.19.0): [[prd-125-thick-full-matrix-ci|PRD-125]]
- 🎯 RF1 — `.nvmrc` permanece 24 → [[NFR-002 - Compatibilidade com Node|NFR-002]]
- 🎯 RF2 — CI matrix `[24, 26]` → [[NFR-002 - Compatibilidade com Node|NFR-002]]
- 🚀 ⬅️ release anterior: [[prd-123-oracle-11g-support|PRD-123 (0.18.0)]] · ➡️ próxima release: [[prd-101-connection-pool-lifecycle|PRD-101 (0.20.0)]]
<!-- brain:auto:end -->
