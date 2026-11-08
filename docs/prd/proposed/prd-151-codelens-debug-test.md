<!-- GENERATED FROM docs/brain/20-PRDs/prd-151-codelens-debug-test.md — DO NOT EDIT -->

# PRD-151 — CodeLens de debug de teste e suíte

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-11-07 |
| Componente | Extensão `paneb.vscode-utplsql` (CodeLens + debugger) |
| Versão alvo | 0.25.0 (onda de UX) |
| Arquivos afetados | `src/codelens.ts`, `src/commands/debug.ts`, `src/i18nLocales.ts`, `package.json`, `package.nls*.json`, `src/test/unit/codelens.test.ts`, `src/test/unit/debugCommands.test.ts`, docs geradas |
| Esforço estimado | 1–2 dias |
| Complexidade | Baixa-Média |
| Relaciona-se a | PRD-53 (debug de testes), PRD-33 (debugger), BR-PARSE-015, BR-PARSE-019 |

## 1. Resumo

Adicionar um terceiro CodeLens por annotation — **Depurar Suite** em `%suite` e
**Depurar Test** em `%test` — ao lado de **Executar** e **Executar com
Cobertura**. O lens chama um novo comando interno (`utplsql.debugLens`) que
reutiliza `startDebugSession(packageName, procName?)`, respeita
`utplsql.debugger.enabled` e mantém a paridade de i18n nos catálogos.

## 2. Contexto e problema

- `UtplsqlCodeLensProvider` já emite **dois lenses** por annotation
  (`utplsql.runLens` com `coverage: false` e `true`), posicionados na linha do
  `%suite`/`%test` (BR-PARSE-015).
- Para depurar um teste específico hoje o usuário precisa:
  - usar o comando `utplsql.debugAtCursor` com o cursor sobre a annotation, ou
  - usar `utplsql.debugTest` (depura o package do arquivo ativo), ou
  - passar pelo Test Explorer/Command Palette.
- Não há ação de debug **no próprio editor**, ao lado das ações de execução, o
  que torna o debug menos descobrível e exige posicionar o cursor corretamente.
- `startDebugSession(packageName, testName?)` já aceita o alvo package+teste;
  `debugAtCursor` já resolve a annotation e chama essa função. Falta apenas
  transportar o alvo resolvido pelo CodeLens para o debugger.

## 3. Objetivos / Não-objetivos

**Objetivos**

- Emitir **3 lenses** por annotation quando o debugger estiver habilitado:
  executar, executar com cobertura e **depurar**.
- Em `%suite`, o lens de debug depura o **package** (sem testName), com o mesmo
  comportamento de `debugAtCursor` na linha do `%suite`.
- Em `%test`, depura **package + procedure** (`testName`), com o mesmo
  comportamento de `debugAtCursor` na linha do `%test`.
- Esconder o lens de debug quando `utplsql.debugger.enabled` for `false`
  (mantendo os dois lenses de execução).
- Novo comando interno `utplsql.debugLens`, com guarda de configuração,
  validação de argumentos e mensagens de erro coerentes com os demais comandos
  de debug.
- Paridade de i18n: títulos/tooltips do lens e título do comando nos **24
  catálogos** (`src/i18nLocales.ts` + `package.nls*.json`).

**Não-objetivos**

- Alterar o protocolo DAP, o `UtplsqlDebugConfigurationProvider` ou a semântica
  de `startDebugSession`.
- Depurar uma seleção/linha arbitrária sem annotation.
- Adicionar uma setting separada para ligar/desligar apenas o lens de debug
  (reutilizar `utplsql.codeLens.enabled` + `utplsql.debugger.enabled`).
- Resolver owner/schema por URI no debug (o comportamento atual usa o usuário da
  conexão; a limitação do schema-mode fica documentada).
- Mudar a ordem/posição dos dois lenses de execução existentes.

## 4. Requisitos

### RF1 — Provider de CodeLens

- Em `src/codelens.ts`, para cada item de `parseCodeLensItems`, adicionar um
  terceiro `vscode.CodeLens` após os dois existentes:
  - título: `codelens.debugSuite` (`%suite`) ou `codelens.debugTest` (`%test`);
  - tooltip: `codelens.debugTip` com `{ desc }`;
  - comando: `utplsql.debugLens`;
  - argumentos: `{ type, packageName, procName }` (sem `uri`, pois
    `startDebugSession` não recebe URI).
- O lens de debug só é emitido se `readConfig().debuggerEnabled` for `true`.
  `codeLensEnabled=false` continua retornando lista vazia para todos.
- A posição/range é a mesma dos lenses de execução (linha da annotation).
- A ordem dos lenses deve ser: executar, executar com cobertura, depurar.

### RF2 — Comando `utplsql.debugLens`

- Registrar em `src/commands/debug.ts` (carregamento lazy do debugger já
  existente).
- Assinatura do argumento:
  `{ type: 'suite' | 'test'; packageName: string; procName?: string }`.
- Comportamento:
  - se `!readConfig().debuggerEnabled`: `showInformationMessage(t('ext.debug.disabled'))`
    e retornar (defesa em profundidade, mesmo com o lens oculto);
  - se `packageName` ausente/vazio ou `type` inválido: ignorar em silêncio (ou
    aviso interno, sem abrir sessão);
  - `type === 'test'` e `procName` ausente: tratar como package (mesma
    semântica de `debugAtCursor` quando não há procName) ou ignorar — decidir na
    implementação e cobrir com teste;
  - chamar `startDebugSession(packageName, type === 'test' ? procName : undefined)`;
  - erros viram `showErrorMessage(e instanceof Error ? e.message : String(e))`,
    como em `debugAtCursor`.
- Reutilizar `startForTarget` (ou extrair um helper comum) para não duplicar a
  validação de configuração/erro.
- Não abrir conexão nem compilar nada antes de `startDebugSession` (o debugger
  já faz o compileForDebug no DAP).

### RF3 — Contribuição do comando e NLS

- Adicionar `utplsql.debugLens` em `package.json` (`commands`, categoria
  `utPLSQL`, título `%nls.command.debugLens%`), espelhando `utplsql.runLens`.
- Adicionar `nls.command.debugLens` em `package.nls.json` e nos 23
  `package.nls.<locale>.json` (paridade exata; o CI de i18n cobra).
- Adicionar as chaves `codelens.debugSuite`, `codelens.debugTest` e
  `codelens.debugTip` em todos os catálogos de `src/i18nLocales.ts`.
- Textos em pt-BR/en no mesmo estilo dos existentes:
  - pt-BR: `⏯ Depurar Suite`, `⏯ Depurar Test`, `Depurar {desc}`;
  - en: `⏯ Debug Suite`, `⏯ Debug Test`, `Debug {desc}`.
  (O ícone final pode ser ajustado para não competir visualmente com ▶.)

### RF4 — Testes

- **Unitários `codelens.test.ts`**:
  - provider com debugger habilitado: 3 lenses por annotation (6 para
    suite+teste), títulos/ordem/argumentos corretos;
  - `debugger.enabled=false`: 2 lenses por annotation (comportamento atual);
  - `codeLens.enabled=false`: 0 lenses;
  - arquivos `.sql`/`.tps`/associações continuam gerando os 3 lenses quando o
    debugger está ligado;
  - `parseCodeLensItems` inalterado.
- **Unitários `debugCommands.test.ts`**:
  - `utplsql.debugLens` com tipo test chama `startDebugSession(pkg, proc)`;
  - tipo suite chama `startDebugSession(pkg, undefined)`;
  - debugger desabilitado informa e não chama;
  - argumento inválido/sem package não chama e não lança;
  - erro do `startDebugSession` vira mensagem de erro.
- **Integração**: atualizar `v017-features.test.ts` (CodeLens) para aceitar o
  terceiro lens quando o debugger estiver habilitado; não é necessário E2E de
  sessão de debug (já coberto por `debuggerE2E`).
- **i18n**: `i18n-reviewer`/teste de paridade deve passar com as novas chaves.

### RF5 — Docs e CHANGELOG

- `README` (e variantes geradas): mencionar o botão de debug no CodeLens na
  lista de features e na tabela de comandos (`utplsql.debugLens`).
- `wiki/Editor-integration.md`: descrever os três lenses e quando o de debug
  aparece.
- `wiki/Commands.md`: linha do `utplsql.debugLens`.
- `wiki/Configuration.md`: ajustar a descrição de `utplsql.codeLens.enabled`
  para “Run/Run with Coverage/Debug”.
- `CHANGELOG.md`: 0.25.0.
- Cada superfície cita `PRD-151` ou `<!-- prd:PRD-151 -->`.

**Não-funcionais**

- RNF1 — Sem dependência nova.
- RNF2 — `provideCodeLenses` continua O(annotations), sem I/O além do
  `readConfig()` já existente.
- RNF3 — Paridade de i18n nos 24 catálogos; nenhuma string hardcoded.
- RNF4 — Cobertura ≥ thresholds do `.c8rc`; testes existentes de contagem de
  lenses atualizados (não “afrouxados”).
- RNF5 — Acessibilidade: títulos e tooltips distinguem claramente execução,
  cobertura e debug.

## 5. Solução proposta

1. `src/codelens.ts`: após os dois `lenses.push(...)` existentes, adicionar o
   terceiro quando `cfg.debuggerEnabled`, com título/tooltip/argumentos.
2. `src/commands/debug.ts`: registrar `utplsql.debugLens`, validar args e
   reutilizar `startForTarget`; manter o carregamento lazy via `loadDebugger()`.
3. `package.json` + `package.nls*.json` + `src/i18nLocales.ts`: comando e chaves.
4. Atualizar testes de CodeLens/debug e docs/CHANGELOG.
5. Rodar `i18n-reviewer`, `brain:ci`, `docs:check`, `test:unit` e a suíte de
   integração do eixo thin.

## 6. Configuração

Nenhuma setting nova. O lens de debug depende de:

- `utplsql.codeLens.enabled` (já existente) — liga/desliga todos os lenses;
- `utplsql.debugger.enabled` (já existente) — liga/desliga o lens de debug e o
  comando.

## 7. Plano de testes

- **Unitários**: `codelens.test.ts` (3 lenses/2 quando debug off/0 quando
  codeLens off; títulos/argumentos) e `debugCommands.test.ts` (suite/test,
  disabled, args inválidos, erro).
- **Integração**: `v017-features` (contagem/visibilidade do CodeLens) e
  `commandsE2E` (comando registrado) no eixo thin; opcionalmente um smoke no
  thick.
- **i18n**: paridade das novas chaves nos 24 catálogos (subagente
  `i18n-reviewer` ou script de checagem).
- **Manual**: abrir um `.pks` com `%suite`/`%test`, confirmar 3 lenses por
  annotation, clicar em “Depurar Test” e verificar a sessão DAP com testName.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Poluição visual com 3 lenses por linha | Títulos curtos/ícone distinto; esconder debug quando desabilitado; documentar |
| Lens de suite depurar o package inteiro e demorar | Tooltip deixa claro (“Depurar <desc>”); comportamento igual ao `debugAtCursor` no `%suite` |
| Divergência de i18n em 24 catálogos | Checklist + `i18n-reviewer` + gate de paridade |
| Regressão nos testes que esperam 2 lenses | Atualizar as expectativas para 2/3 conforme `debugger.enabled`, sem relaxar asserções |
| Schema-mode com package homônimo em owners diferentes | Documentar a limitação atual (debug usa o usuário da conexão); owner por URI fica fora de escopo |
| Comando acessível na Palette sem contexto | Mesmo padrão de `utplsql.runLens`; validar args e sair em silêncio |

## 9. Rollout

- **0.25.0** (onda de UX, separada da 0.24.0 de segurança/distribuição).
- `CHANGELOG.md` com o novo CodeLens.
- Sem migração de settings; usuários com debugger desabilitado não veem
  diferença.

## 10. Critérios de aceite

- Com debugger habilitado, cada `%suite`/`%test` mostra **3 lenses** na ordem
  executar → cobertura → depurar.
- Com debugger desabilitado, continuam **2 lenses** e o comando informa que o
  debug está desligado.
- `utplsql.debugLens` em `%test` chama `startDebugSession(package, procName)`;
  em `%suite`, `startDebugSession(package)`.
- Nenhuma string hardcoded; 24 catálogos com paridade.
- Testes unitários de CodeLens/debug atualizados e verdes; cobertura ≥ thresholds.
- `i18n-reviewer`, `brain:ci`, `docs:check` e `version:check` verdes.
- README/wiki/CHANGELOG citam `PRD-151`.

## 11. Questões em aberto

- O lens de suite deve depurar o package inteiro (comportamento atual do
  `debugAtCursor`) ou exigir um teste? **Proposta:** package inteiro, com
  tooltip explícito.
- Exibir o lens de debug desabilitado (cinza) ou ocultar? **Proposta:** ocultar.
- O comando deve aparecer na Command Palette ou ser interno como `runLens`?
  **Proposta:** contribuir como `runLens` (palette), com validação de args.
- Ícone: `⏯`/`🐞`/sem ícone? **Proposta:** `⏯` ou `Debug` textual, sem emoji
  extra para não poluir.

## 12. Impacto no cérebro

Atualizar **`BR-PARSE-015`** (“CodeLens gera dois lenses por annotation”) para
refletir **dois lenses de execução/cobertura + um de debug quando
`utplsql.debugger.enabled`**, com `prds: ["PRD-151"]`, `implementacao:` e
`testes:`. Se a mudança de título/links da regra for custosa, criar
**`BR-PARSE-020`** para o lens de debug e ajustar a 015 para “dois lenses de
execução/cobertura”. RNFs sem regra: RNF1 (sem dep), RNF2 (performance),
RNF3 (i18n), RNF4 (cobertura), RNF5 (acessibilidade) — verificadas por
testes/CI.

## Impacto nas docs

- `CHANGELOG`: novo CodeLens de debug na versão alvo.
- `README` (e 23 variantes): features, tabela de comandos e descrição da setting
  `utplsql.codeLens.enabled`.
- `wiki/Editor-integration.md`: os três lenses e a condição de exibição.
- `wiki/Commands.md`: `utplsql.debugLens`.
- `wiki/Configuration.md`: descrição atualizada do `codeLens.enabled`.
- Cada superfície cita `PRD-151` ou `<!-- prd:PRD-151 -->`.
