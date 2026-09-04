# PRD-47 — Node 26 no toolchain de desenvolvimento

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber |
| Data | 2026-08-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.0 |
| Arquivos afetados | `.nvmrc`, `.github/workflows/ci.yml`, `docs/functional/10-development-tooling.md`, `docs/wiki/Como-contribuir.md`, `CHANGELOG.md` |
| Esforço estimado | 0,5 dia |
| Complexidade | Baixa |

## 1. Resumo

Adotar o Node 26 no **toolchain de desenvolvimento** (`.nvmrc` + CI matrix) a
partir do seu LTS (outubro/2026). `engines.node` permanece em `>= 22` — o piso
do host do VSCode — e `@types/node` permanece em `^22`, tipando pelo runtime
onde o bundle realmente executa.

## 2. Contexto e problema

São dois runtimes distintos no projeto:

- **Runtime da extensão** = Node embutido no VSCode (host). `engines.node`
  restringe onde a extensão instala e executa. Os hosts atuais (VSCode 1.96+)
  rodam Node 22; nenhum host embarca Node 26 (o Electron acompanha o Node com
  anos de atraso). `engines.node >= 26` bloquearia a instalação em todo VSCode
  atual.
- **Toolchain de desenvolvimento** = Node da máquina do dev/CI (`.nvmrc` 24,
  matrix 22/24). Node 20 atingiu EOL (04/2026) e já foi removido da matrix
  (0.11.0); o próximo passo natural é incluir o 26 — mas apenas após o LTS
  (out/2026), pois antes disso é "current" e CI em não-LTS é flaky.

`@types/node` foi alinhado ao piso (`^22`, commit `81c77d7` na 0.11.0): o
bundle executa no host (Node 22) e tipos acima do piso permitiriam usar APIs
ausentes em produção. Essa decisão permanece nesta PRD.

## 3. Objetivos / Não-objetivos

**Objetivos**
- `.nvmrc` → `26` (após o LTS do Node 26)
- CI matrix → `[22, 24, 26]`
- Validar a suíte completa no Node 26 localmente antes de consolidar

**Não-objetivos**
- `engines.node` acima de `>= 22` (piso do host do VSCode)
- `@types/node` acima de `^22`
- Mudanças de código para APIs do Node 26

## 4. Requisitos

### RF1 — `.nvmrc` no 26

`.nvmrc` aponta para `26` somente após o LTS (outubro/2026).

### RF2 — CI matrix com 26

`ci.yml`: `node-version: [22, 24, 26]`. `npm test` (que dispara
`pretest:unit` com compile + lint) deve passar nos três.

### RF3 — Reavaliação do piso do host

Quando o VSCode embarcar Node ≥ 24 (acompanhar roadmap do Electron/VSCode),
reavaliar `engines.node` e `@types/node` — fora do escopo imediato desta PRD.

**Não-funcionais**
- RNF1 — Sem regressão: 350 unit + coverage acima dos thresholds no Node 26
- RNF2 — VSIX inalterado (o bundle não muda — é só toolchain)

## 5. Solução proposta

### 5.1 Execução em uma etapa única

```sh
# .nvmrc → 26
# .github/workflows/ci.yml → node-version: [22, 24, 26]
nvm use 26
npm test          # pretest:unit (compile + lint) + 350 testes
npm run test:coverage
```

Docs: `docs/functional/10-development-tooling.md` e
`docs/wiki/Como-contribuir.md` (menção a Node 26 na matrix).

## 6. Configuração

Nenhuma setting/comando novo.

## 7. Plano de testes

- **Unitários**: `npm test` local no Node 26 — 350 testes verdes
- **Integração**: opcional (`npm run test:integration` local no 26)
- **Validação manual**: `npm run package` gera o VSIX normalmente
- **CI**: matrix 22/24/26 verde no push

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Executar antes do LTS (current) gera CI flaky | Gate de data: só após out/2026 |
| Node 26 remove APIs usadas pelo toolchain (testes, scripts) | Suíte completa + `scripts/run-tests.cjs` exercitados antes de consolidar |
| Desalinhamento entre devs (alguns no 24, outros no 26) | `.nvmrc` é a fonte; matrix cobre os três |

## 9. Rollout

- Versão alvo: 0.12.0 (minor) — mudança de toolchain, zero impacto no usuário
- Entry no CHANGELOG.md
- Se o release 0.12.0 sair antes do LTS do 26, esta PRD desliza para a release seguinte

## 10. Critérios de aceite

- [ ] `.nvmrc` → `26`; CI matrix → `[22, 24, 26]` (pós-LTS out/2026)
- [ ] `npm test` verde localmente no Node 26 (350 testes + compile + lint)
- [ ] `npm run test:coverage` acima dos thresholds
- [ ] `engines.node` permanece `>= 22` e `@types/node` permanece `^22`
- [ ] Docs e CHANGELOG atualizados

## 11. Questões em aberto

- Quando o VSCode embarcará Node ≥ 24? (gatilho para RF3 — acompanhar roadmap)
- Incluir Node 26 como "current" antes do LTS em job separado e não-bloqueante? (alternativa a descartar — sugere-se manter simples)
