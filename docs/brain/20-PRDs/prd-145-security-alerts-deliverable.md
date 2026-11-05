---
tipo: prd
id: PRD-145
aliases: [PRD-145]
status: proposed
titulo: "Segurança do entregável: logging de credenciais, cadeia de build e triagem dos alertas do GitHub"
versao: "0.24.0"
data: "2026-11-05"
autor: "Gil Cleber Barboza"
versao_titulo: "0.24.0 — UX, segurança e distribuição"
verificado: "2026-11-05"
regras: []
docs: ["CHANGELOG", "SECURITY.md"]
tags: [prd]
---

# PRD-145 — Segurança do entregável: logging de credenciais, cadeia de build e triagem dos alertas do GitHub

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-11-05 |
| Componente | Extensão `paneb.vscode-utplsql` + CI/CD (`.github/`) |
| Versão alvo | 0.24.0 |
| Arquivos afetados | `src/logger.ts`, `src/redact.ts`, `src/oracleRunner.ts`, `src/discovery.ts`, `.github/workflows/ci.yml`, `.github/workflows/google-index.yml`, `SECURITY.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-81, PRD-104, PRD-119, PRD-142, PRD-144 |

## 1. Resumo

Fechar os alertas de segurança do GitHub que atingem o **entregável** (o `.vsix`
publicado) e a **cadeia que o produz**: (1) o achado CodeQL
`js/clear-text-logging` que rastreia a senha da connection até o sink de log;
(2) o gate de dependências, hoje só de produção, estendido ao toolchain que
empacota o artefato; (3) a pinagem por hash da dependência Python do workflow de
indexação; (4) a triagem documentada dos alertas de higiene do OSSF Scorecard e a
atualização do `SECURITY.md`. Itens de puro conforto de teste (glob/minimatch em
`mocha`/`c8`) ficam fora: são dev-only, não entram no `.vsix` e já foram
resolvidos por `overrides` (ver §2).

## 2. Contexto e problema

Auditoria dos alertas do repositório em 2026-11-05:

| Origem | Abertos | Situação |
|---|---|---|
| Code scanning (CodeQL) | 1 | `js/clear-text-logging` (high) em `src/logger.ts:36` |
| Code scanning (Scorecard) | 6 | higiene de supply chain, não são bugs de código |
| Dependabot | 4 | 100% `development` / transitivos |
| Secret scanning | 0 | — |

`npm audit --omit=dev` está limpo: o que **shippa** (`fast-xml-parser`,
`oracledb`) não tem advisory. Os CVEs restantes estavam em
`mocha`/`c8`/`@vscode/test-cli`/`@vscode/vsce`; `glob` 14.0.2, `minimatch` 11.0.1
e `serialize-javascript` 7.1.4 fecharam a cadeia via `overrides` (0
vulnerabilidades, `test:unit` verde), mas **não há gate** que impeça a regressão.

O achado CodeQL é o único que toca o runtime: a senha vem de
`stored.password` (`connectionProfiles.ts`), vira connection string em
`getProfileConnection`, é passada ao `oracleRunner` e chega ao `logger.debug`
via `redactConnection(String(e), connection)`. O `redactConnection` mascara a
ocorrência **exata** da connection, mas o CodeQL não modela
`split().join()` como sanitizer — e, em runtime, variantes (encoding, aspas,
mensagem parcial) escapam da substituição literal. O alerta some se o valor
derivado da senha deixar de alcançar o sink, o que exige uma mudança estrutural
no logging, não só na máscara.

O restante são alertas de postura: `PinnedDependencies` (pip sem hash),
`SAST` (22/30 commits — transitório desde a ativação do default setup em
2026-10-02, mantido por decisão registrada em
`src/test/unit/workflowPolicy.test.ts`), `Fuzzing` (não aplicável a uma
extensão VS Code), `CII-Best-Practices` e `Code-Review` (projeto solo,
`required_approving_review_count: 0`). Sem triagem registrada, eles se acumulam e
escondem achados novos.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Garantir que nenhum valor derivado de credencial alcance `logger`/`console`.
- Estender o gate de dependências ao toolchain de build/empacotamento, sem
  depender de `overrides` não documentados.
- Pinar por hash a dependência Python do workflow de indexação.
- Triar e registrar cada alerta de higiene (corrigir ou dispensar com motivo).
- Alinhar `SECURITY.md` ao estado real (inclui drift dos checks `build (22/24/26)`).

**Não-objetivos**
- Hardening de parsers, path traversal e HTML de cobertura — PRD-144.
- Sandboxing de HTML ou mudança no contrato de `SecretStorage` (PRD-81).
- Migrar o CodeQL para advanced setup: a decisão vigente é manter o default
  setup (teste `workflowPolicy`), e este PRD não a revisita.
- Vulnerabilidades dev-only de ferramentas de teste que não participam do
  empacotamento — já resolvidas por `overrides`, sem PRD própria.

## 4. Requisitos

### RF1 — Logging sem dados derivados da connection

- Adicionar `scrubCredentials(text: string): string` em `src/redact.ts`,
  mascarando de forma genérica `user/senha@host` (regex ancorada) e variantes
  com aspas/espaços, além do fallback por connection conhecida.
- Aplicar `scrubCredentials` **no sink** (`src/logger.ts`): todo `string` de
  `ctx` (inclusive aninhado em um nível) passa pela função antes de
  `console.*`/`emit`. Ponto único de garantia.
- Remover a connection do caminho de log nos call sites de `oracleRunner.ts` e
  `discovery.ts` (`redactConnection(String(e), connection)` →
  `scrubCredentials(String(e))`), quebrando a cadeia de taint do CodeQL.
- Manter `redactConnection`/`maskConnection` para as mensagens de UI.

### RF2 — Gate de dependências do entregável e da cadeia de build

- `ci.yml`: rodar `npm audit --audit-level=high` (dev incluído) no eixo Node 24,
  mantendo `npm run audit:prod` como gate de produção.
- Documentar em `SECURITY.md` a política de `overrides`: cada pin cita o
  advisory, a versão corrigida e a condição de remoção (quando o upstream
  migrar). Revisão a cada bump de `mocha`/`c8`/`@vscode/test-cli`/`@vscode/vsce`.

### RF3 — Pinagem por hash do pip

- `.github/workflows/google-index.yml`: substituir
  `pip install google-auth requests` por `requirements.txt` com hashes e
  `pip install --require-hashes -r`.
- Falha de resolução de hash deve falhar o job (não degradar para instalação
  livre).

### RF4 — Triagem dos alertas do Scorecard

Registrar no `SECURITY.md` (ou em nota do vault) a decisão para cada alerta:

| Alerta | Decisão |
|---|---|
| `PinnedDependencies` (#13) | corrigir (RF3) |
| `SAST` (#15) | transitório desde a ativação; reavaliar após 30 dias |
| `Fuzzing` (#16) | dispensar — extensão VS Code não expõe parser de rede |
| `Code-Review` (#17) | dispensar — mantenedor único; PR obrigatório já ativo |
| `CII-Best-Practices` (#18) | avaliar adesão ao badge OpenSSF |

### RF5 — `SECURITY.md` fiel

- Corrigir `build (22/24/26)` → `build (24)` + `build (26)` + `CodeQL`
  (checks exigidos pela proteção da `main`).
- Acrescentar as proteções de RF1 e a política de overrides de RF2.

### RF6 — Testes

- Unitário: `scrubCredentials` mascara `user/senha@host`, variantes com aspas e
  mensagem sem a connection exata.
- Unitário: sink de log capturado não contém a senha em nenhum nível de `ctx`
  (inclusive objeto aninhado).
- Unitário de política: `google-index.yml` usa `--require-hashes` e nenhuma
  action deixa de ser pinada por SHA (já coberto por `workflowPolicy`).

**Não-funcionais**
- RNF1 — Sem regressão nos 1619 testes unitários existentes.
- RNF2 — `scrubCredentials` não pode corromper mensagens sem credencial
  (custo O(n), sem regex catastrófica — PRD-143).
- RNF3 — `npm audit` (dev incluído) permanece 0 no merge.

## 5. Solução proposta

- `redact.ts` concentra `maskConnection`, `redactConnection` e o novo
  `scrubCredentials` (regex ancorada no formato de credencial, com fallback para
  a connection conhecida).
- `logger.ts` aplica `scrubCredentials` a `msg` e a cada valor string de `ctx`
  antes de emitir; o `sink` do `LogOutputChannel` herda a garantia.
- Call sites deixam de passar a connection ao logger: o erro é sanitizado no
  ponto de origem, sem transportar o segredo.
- CI ganha o gate `npm audit --audit-level=high`; o workflow de indexação passa a
  usar `requirements.txt` com hashes.
- Triagem do Scorecard e correções do `SECURITY.md` no mesmo PR.

## 6. Configuração

Nenhuma nova setting ou comando. `utplsql.debug`/`UTPLSQL_DEBUG` mantêm o
comportamento, agora com sanitização no sink.

## 7. Plano de testes

- **Unitários**: `scrubCredentials` (positivos/negativos), logger com sink fake,
  política de workflow (hash do pip, pin de actions).
- **Integração**: rodada real com connection inválida e `UTPLSQL_DEBUG=1`;
  inspecionar o output channel e garantir que a senha não aparece.
- **Validação manual**: conferir que os alertas CodeQL/Dependabot/Scorecard
  esperados fecharam ou foram dispensados com justificativa.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `scrubCredentials` mascarar texto legítimo | Ancorar no formato `user/senha@host` e no usuário conhecido; testes negativos. |
| CodeQL continuar apontando mesmo após remover a connection do log | Confirmar no próximo analysis; se persistir, dispensar com justificativa linkando o teste que prova a ausência da senha. |
| Gate `npm audit` (dev) quebrar o CI quando surgir advisory sem correção | Política de `overrides` documentada + `--audit-level=high` (não falha em low/moderate). |
| Hashes do pip desatualizarem | `requirements.txt` versionado; Dependabot cobre `pip` no diretório. |

## 9. Rollout

- Release alvo: 0.24.0 (mesma janela da PRD-144).
- `CHANGELOG.md`: entrada de segurança com os itens de RF1–RF5.
- `SECURITY.md`: "Implemented protections" + política de overrides + triagem.

## 10. Critérios de aceite

- Nenhum log (console ou output channel) contém a senha em cenário de falha de
  conexão com `UTPLSQL_DEBUG=1`.
- `npm audit` (dev incluído) = 0 e `npm run audit:prod` = 0.
- `google-index.yml` instala Python com `--require-hashes`.
- Cada alerta de code scanning aberto tem correção ou dispensa registrada.
- `SECURITY.md` sem divergência dos checks exigidos pela proteção da `main`.
- `npm run test:unit`, `lint`, `typecheck` e `brain:ci` verdes.

## 11. Questões em aberto

- O gate `npm audit --audit-level=high` deve cobrir dev no `publish.yml` também,
  ou só no `ci.yml`?
- Vale aderir ao badge OpenSSF (CII) nesta versão ou deixar para 0.25.0?
- O `scrubCredentials` deve ser exportado para uso nos scripts dev
  (`create-pr.cjs`/`create-release.cjs`) ou fica restrito ao runtime?

## 12. Impacto no cérebro

Regras previstas (criadas na implementação, com `prds: ["PRD-145"]`):
`SEC-016` (nenhum valor derivado de credencial alcança o sink de log),
`SEC-017` (política de `overrides` de dependências e gate de audit dev) e
`BR-PLAT-00x` (pinagem por hash de dependências Python no CI). Se a triagem do
Scorecard não gerar regra, registrar **nenhuma** adicional aqui.

## Impacto nas docs

- `CHANGELOG`: entrada da versão 0.24.0 com o hardening de logging, o gate de
  dependências e a pinagem do pip.
- `SECURITY.md`: novas proteções (sanitização no sink, gate dev, overrides),
  triagem dos alertas do Scorecard e correção dos checks `build (24)`/`build (26)`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-81-security-hardening|PRD-81]] · [[prd-104-ci-supply-chain|PRD-104]] · [[prd-119-security-posture-scorecard|PRD-119]] · [[prd-142-supply-chain-provenance-typecheck-gate|PRD-142]] · [[prd-143-redos-regex-audit-input-validation|PRD-143]] · [[prd-144-security-runtime-hardening|PRD-144]]
- ⚙️ Pipelines: [[PIPE-ci - CI|PIPE-ci]] · [[PIPE-google-index - Google Index Check|PIPE-google-index]]
- 🔗 Mesma versão (0.24.0): [[prd-121-auditable-package-sourcemap|PRD-121]] · [[prd-122-marketplace-trust-metadata|PRD-122]] · [[prd-132-ux-execution-dryrun-jump|PRD-132]] · [[prd-133-rate-limiting-keybindings|PRD-133]] · [[prd-140-statusbar-settings-grouping|PRD-140]] · [[prd-141-onboarding-walkthrough-accessibility|PRD-141]] · [[prd-142-supply-chain-provenance-typecheck-gate|PRD-142]] · [[prd-143-redos-regex-audit-input-validation|PRD-143]] · [[prd-144-security-runtime-hardening|PRD-144]]
- 🚀 ⬅️ release anterior: [[prd-126-branch-coverage-cli-tests|PRD-126 (0.23.0)]] · ➡️ próxima release: [[prd-146-attestations-publish|PRD-146 (0.25.0)]]
<!-- brain:auto:end -->
