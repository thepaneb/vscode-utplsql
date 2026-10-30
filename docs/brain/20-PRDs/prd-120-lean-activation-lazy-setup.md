---
tipo: prd
id: PRD-120
aliases: [PRD-120]
status: proposed
titulo: "Ativação enxuta e validação de setup preguiçosa"
versao: "0.20.0"
data: "2026-10-13"
autor: "Gil Cleber Barboza"
versao_titulo: "0.20.0 — Observabilidade e desempenho"
verificado: 2026-10-30
regras: []
tags: [prd]
---

# PRD-120 — Ativação enxuta e validação de setup preguiçosa

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-13 |
| Componente | Extensão `paneb.vscode-utplsql` (ativação e diagnóstico de setup) |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `package.json` (`activationEvents`), `src/extension.ts`, `src/quickfix.ts` (`SetupValidator`), `src/config.ts`, `src/test/unit/*`, `src/test/integration/dbPaths.test.ts`, `docs/brain/**` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-101 (ciclo de vida de conexões), PRD-102 (tracing), PRD-106 (harness de performance), PRD-109 (identidade de linguagem), PRD-107 (fixture sem privilégios) |

## 1. Resumo

A auditoria externa (**VSCan**) marcou **“Broad Activation” (medium)**: com
`onStartupFinished` a extensão **carrega em toda janela do VS Code**, mesmo em
workspaces sem nada de utPLSQL. Pior: hoje a ativação dispara
`SetupValidator.validateOnActivation()`, que **abre conexão Oracle** sempre que há
uma conexão resolvível (`utplsql.connection`, `UTPLSQL_CONN` ou cache de sessão).
Esta PRD estreita os `activationEvents` e torna a validação de setup **preguiçosa,
idempotente e sem conexão durante a ativação**.

## 2. Contexto e problema

`package.json` hoje declara:

```json
"activationEvents": [
  "onStartupFinished",
  "workspaceContains:**/*.pks",
  "workspaceContains:**/*.pkb",
  "workspaceContains:**/*.sql",
  "onLanguage:plsql"
]
```

Dois efeitos indesejados:

1. **`onStartupFinished`** faz a extensão ativar em **qualquer** workspace (mesmo um
   projeto Java/SQL Server sem PL/SQL), pagando custo de ativação sem uso. O
   `workspaceContains:**/*.sql` já é bem amplo (qualquer workspace com um `.sql`).
2. **Conexão na ativação**: `activate()` roda, em *fire-and-forget*,
   `validateOnActivation()` + `validateUtplsqlInstall()` (`extension.ts`). A
   validação chama `resolveConnectionNoPrompt()` e, havendo conexão,
   `ensurePool(...).getConnection()` — ou seja, **abre uma sessão Oracle no
   banco apontado pelas settings**, antes de qualquer ação do usuário.

Mitigação que já existe: `capabilities.untrustedWorkspaces.supported = false`
(Workspace Trust) e `utplsql.setupDiagnosticsEnabled`. Ainda assim, num workspace
**confiável** que por acaso tenha settings de conexão (ou `UTPLSQL_CONN` no
ambiente), a extensão conecta ao banco “sozinha” ao abrir a janela — custo de
startup e superfície de rede desnecessários. Também fere o espírito da `SEC-010`
(“fluxos não interativos nunca abrem prompt de conexão”): aqui não há prompt, mas
há conexão não solicitada.

A extensão **não depende** de `onStartupFinished` para funcionar: o piso de
engines é `^1.101.0` (PRD-94), e o VS Code gera *activation events* implícitos a
partir de `contributes.commands`, `contributes.debuggers` e `contributes.languages`
(id `plsql` → `.pks`, `.pkb`, `.prc`, `.fnc`, `.trg`).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Remover `onStartupFinished`; ativar só em workspace relevante
  (`workspaceContains`), em comando explícito ou em `onLanguage:plsql`.
- **Não abrir conexão Oracle durante a ativação**: a validação de setup vira
  preguiçosa (primeira interação relevante, ou comando) e nunca bloqueia o start.
- Manter o valor do diagnóstico: o usuário continua recebendo os avisos de setup
  (conexão inválida, versão antiga do utPLSQL, thick mode) — só que no momento certo.

**Não-objetivos**
- Remover a exigência de Workspace Trust.
- Mudar a ordem de resolução de conexão (`setting → UTPLSQL_CONN → cache → prompt`).
- Redesenhar o ciclo de vida do pool (é a PRD-101) ou instrumentar fases (PRD-102).
- Reintroduzir um `waitUntil` de ativação longo: a ativação deve continuar barata.

## 4. Requisitos

### RF1 — `activationEvents` enxutos

- Remover `onStartupFinished`.
- Manter `workspaceContains:**/*.pks` e `workspaceContains:**/*.pkb`.
- Reavaliar `workspaceContains:**/*.sql` (tão amplo quanto `onStartupFinished` na
  prática) e, se reduzido, cobrir o caso de uso com `onLanguage:plsql`
  (+ os `languageIds` da PRD-109, quando existirem) e com a ativação implícita
  por `contributes.commands`.
- Garantir que **nenhum** caminho de UX regride: árvore do Test Explorer
  populada ao abrir workspace com specs; CodeLens/decorations; Debug.

### RF2 — Validação de setup preguiçosa

- `validateOnActivation()` deixa de ser chamada no `activate()`.
- A validação roda em *idle* (`setTimeout`/`requestIdleCallback`-like) ou na
  **primeira interação relevante** com a extensão (abrir `.pks`, expandir a
  árvore, rodar um teste, abrir uma conexão) — e **a cada** disparo continua
  sujeita a `utplsql.setupDiagnosticsEnabled`.
- Expor comando `utplsql.validateSetup` (idempotente, reexecutável) para o usuário
  forçar o diagnóstico.

### RF3 — Sem conexão na ativação

- Nenhum caminho do `activate()` pode chamar `getConnection`/`getConnection` de
  pool. A checagem de conectividade/instalação só ocorre no fluxo preguiçoso do RF2.
- O resultado do diagnóstico é **memoizado por sessão** (não repete a conexão a cada
  evento) e invalidado por `onDidChangeConfiguration('utplsql')`.

### RF4 — Documentação

- Atualizar a nota do vault do README (Keybindings/Configuração/“Pontos de
  atenção” de ativação) e o `AGENTS.md` do dev; registrar a decisão no cérebro
  (§12). `npm run brain:sync && npm run brain:build` regeneram README/wiki.

**Não-funcionais**
- RNF1 — **Zero** conexões Oracle durante a ativação (garantido por teste).
- RNF2 — Ativação sem conexão mensurável pelo harness da PRD-106 (baseline
  antes/depois); sem regressão perceptível no tempo de abrir um workspace com specs.
- RNF3 — Nenhuma mudança no comportamento da árvore/CodeLens ao abrir workspace com
  `.pks`/`.pkb` (teste de integração).
- RNF4 — O diagnóstico segue aparecendo **no máximo uma vez** por sessão.

## 5. Solução proposta

- `package.json`: remover `onStartupFinished`; ajustar a lista conforme RF1.
- `extension.ts`: trocar o bloco `void (async () => { … validateOnActivation() … })()`
  por um agendador preguiçoso (`scheduleSetupValidation()`), disparado por
  `onLanguage:plsql`/primeiro comando e por `utplsql.validateSetup`.
- `quickfix.ts`: extrair a checagem para uma função pura/injetável, de modo que o
  teste possa afirmar “nenhuma conexão na ativação” (ex.: contador de
  `getConnection` no stub/`oracledb` mockado).
- `context.ts`/`config.ts`: expor o flag `setupValidationRan` para memoização.

## 6. Configuração

- **Novo comando**: `utplsql.validateSetup` (palette). Sem nova setting; as
  existentes (`utplsql.setupDiagnosticsEnabled`) mantêm o gate.

## 7. Plano de testes

- **Unitários**: (a) `package.json` não contém `onStartupFinished`; (b) a validação
  não é chamada no caminho de `activate()`; (c) memoização — reexecução não repete
  a conexão.
- **Integração**: workspace com `.pks` → árvore populada e diagnóstico aparece
  (comportamento atual preservado, ex.: `dbPaths.test.ts` adaptado ao gatilho
  preguiçoso); workspace **sem** PL/SQL → extensão **não** ativa.
- **Manual**: com `UTPLSQL_CONN` apontando para um banco de teste, abrir um
  workspace alheio e confirmar **nenhuma** sessão nova no `v$session` até a
  primeira interação.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Árvore do Test Explorer vazia até o usuário abrir um `.pks` | `workspaceContains` cobre o caso comum; RNF3 trava por teste; reavaliar `**.sql` no RF1 |
| `onLanguage:plsql` só dispara ao abrir o arquivo, não ao listar o workspace | Manter `workspaceContains` para o caso de detecção; `onLanguage` é complemento |
| Diagnóstico “some” e o usuário não percebe o erro de setup | Comando explícito `utplsql.validateSetup` + aparição no primeiro uso (quando o erro importa) |
| Memoização esconder mudança de conexão | Invalidar por `onDidChangeConfiguration('utplsql')` |
| Regressão de ativação difícil de medir | Medir com o harness da PRD-106 antes/depois |

## 9. Rollout

- **0.20.0** — junto de PRD-101 (pool) e PRD-102 (tracing), porque toca o mesmo
  ciclo de vida de conexão; a instrumentação da 102 permite medir o ganho.
- Registrar no `CHANGELOG.md`; documentar o novo comando no README (vault) e na wiki.

## 10. Critérios de aceite

- `activationEvents` sem `onStartupFinished` e sem regressão de UX comprovada por teste.
- Nenhuma conexão Oracle na ativação (teste automatizado) — com `UTPLSQL_CONN` setado.
- `utplsql.validateSetup` disponível, idempotente e documentado.
- Diagnóstico aparece no máximo uma vez por sessão.
- README/wiki/`AGENTS.md` atualizados e `brain:ci` verde.

## 11. Questões em aberto

- Manter `workspaceContains:**/*.sql`? Ele é quase tão amplo quanto
  `onStartupFinished`; sem ele, workspaces só-`.sql` ativam apenas no 1º comando/arquivo.
- O gatilho preguiçoso deve ser *idle* (tempo) ou por primeiro evento de uso? (Afeta
  quando o aviso de setup aparece.)
- A PRD-101 pode absorver parte do RF2/RF3, ou mantém-se a separação
  (101 = pool ocioso, 120 = ativação/probe)?

## Reavaliação (2026-10-30)

O re-scan do **VSCan 0.18.0** confirmou o achado: `onStartupFinished` continua
presente, a extensão ativa em qualquer workspace e `activate()` ainda chama
`validateOnActivation()` (conexão Oracle em *fire-and-forget*). O
`activationEvents` atual tem **5** entradas (inclui `onLanguage:plsql`; o texto
acima listava 4).

A PRD segue **válida e sem bloqueios** (a PRD-109, que cobre identidade de
linguagem, já foi concluída). **Prioridade recomendada:** subir para o **primeiro
item da 0.20.0**, antes de 107/101/102/103/106 — é uma correção de
permissão/startup de 1–2 dias, independente das demais, e resolve o “Broad
Activation” (medium) do VSCan. O `workspaceContains:**/*.sql` pode ser decidido
com a medição da PRD-106; o ganho principal é remover `onStartupFinished` e a
conexão na ativação.

## 12. Impacto no cérebro

Na conclusão, criar regra de ciclo de vida/ativação — candidata **`BR-CONN-017`**
(“a ativação da extensão não abre conexão Oracle; a validação de setup é preguiçosa
e memoizada”) — com `prds: ["PRD-120"]`, `implementacao:` (`src/extension.ts`,
`src/quickfix.ts`, `package.json`) e `testes:` (`src/test/unit/*` do
ativação/probe + `dbPaths.test.ts`). Revisar `SEC-010` para citar explicitamente
que a ativação tampouco conecta. Enquanto `proposed`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-94-vscode-floor-1-101|PRD-94]] · [[prd-101-connection-pool-lifecycle|PRD-101]] · [[prd-102-trace-and-perf-instrumentation|PRD-102]] · [[prd-106-perf-harness|PRD-106]] · [[prd-107-unprivileged-fixture|PRD-107]] · [[prd-109-language-identity|PRD-109]]
- 🔗 Mesma versão (0.20.0): [[prd-101-connection-pool-lifecycle|PRD-101]] · [[prd-102-trace-and-perf-instrumentation|PRD-102]] · [[prd-103-incremental-source-reindex|PRD-103]] · [[prd-106-perf-harness|PRD-106]] · [[prd-107-unprivileged-fixture|PRD-107]]
- 🚀 ⬅️ release anterior: [[prd-125-thick-full-matrix-ci|PRD-125 (0.19.0)]] · ➡️ próxima release: [[prd-88-locale-aware-formatting|PRD-88 (0.21.0)]]
<!-- brain:auto:end -->
