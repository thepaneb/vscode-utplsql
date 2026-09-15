# PRD-50 — Auto-run on Save (Watch Mode)

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.14.0 |
| Arquivos afetados | `src/extension.ts`, `src/config.ts`, `src/state.ts`, `package.json` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Adicionar um modo *watch*: quando um spec de teste `.pks` é salvo, re-executar
automaticamente as suites daquele arquivo. Hoje o watcher (`extension.ts:412`)
apenas dispara o *discovery* (`refresh`); o usuário precisa rodar manualmente.
Jest (`watch`/`on-save`), Python (autorun), PHPUnit (continuous) e Go oferecem
variações disso.

## 2. Contexto e problema

O fluxo TDD típico é editar → salvar → ver resultado. Hoje a extensão exige um
clique manual (CodeLens, gutter ou atalho) a cada iteração. A infraestrutura
necessária já existe:

- `extension.ts:412-417` — `createFileSystemWatcher('**/*.{pks,pkb}')` já chama
  `refresh(controller)` em create/change/delete (auto-discovery já funciona).
- `runForUri(controller, uri, coverage)` + `filterSuitesByUri` (`matching.ts:34`)
  já sabem mapear um arquivo para suas suites e executá-las.

O que falta é acoplar o evento de save à *execução*, com debounce e guarda
contra loops.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Setting `utplsql.autoRun`: `off` (padrão) | `onSave` (re-executa suites do
  arquivo salvo) — extensível a `onChange` no futuro.
- Debounce configurável para evitar disparos em rajada.
- Re-uso de `runForUri` (mesma semântica de "Run Test File").

**Não-objetivos**
- Watch contínuo de fontes de produção (só `.pks` de teste nesta PRD).
- Recompilar PL/SQL automaticamente antes de rodar (ver Riscos).
- Auto-run em pastas ou em `onChange` (follow-up).

## 4. Requisitos

### RF1 — Setting `utplsql.autoRun`

```jsonc
"utplsql.autoRun": {
  "type": "string",
  "enum": ["off", "onSave"],
  "default": "off",
  "markdownDescription": "Re-executa automaticamente as suites do arquivo .pks salvo (modo watch)."
},
"utplsql.autoRunDelayMs": {
  "type": "number",
  "default": 500,
  "minimum": 100,
  "maximum": 5000
}
```

### RF2 — Disparo no save

Em vez de estender o `FileSystemWatcher` atual (que não distingue save de
edição), usar `vscode.workspace.onDidSaveTextDocument`, filtrando documentos
`.pks` que pertencem ao workspace e que têm suites descobertas.

```typescript
// extension.ts
context.subscriptions.push(
  vscode.workspace.onDidSaveTextDocument((doc) => {
    if (!readConfig().autoRunEnabled) return;
    if (!doc.fileName.endsWith('.pks')) return;
    scheduleAutoRun(doc.uri, controller);
  }),
);
```

### RF3 — Debounce por arquivo

Manter um mapa `uri → timer` para que múltiplos saves rápidos do mesmo arquivo
disparem uma única execução; salvar arquivos diferentes não se cancela.

### RF4 — Guarda contra execução concorrente

Se já houver uma execução em andamento (`utplsql:running`), enfileirar a
próxima (coalescer por arquivo) ou ignorar, conforme setting
`utplsql.autoRunQueue: 'replace' | 'skip'` (default `skip`).

**Não-funcionais**
- RNF1 — Nunca disparar em loop: execução não altera arquivos, então o evento
  de save não é retroalimentado.
- RNF2 — Auto-run respeita `utplsql.runnerMode` (Oracle direto ou CLI) sem
  mudança no `executeRun`.

## 5. Solução proposta

### 5.1 `src/state.ts`

Adicionar ao `TestStateManager` um `autoRunTimers: Map<string, NodeJS.Timeout>`
e um `autoRunRunning: boolean` (flag de concorrência), com helpers
`scheduleAutoRun`/`clearAutoRun`.

### 5.2 `src/extension.ts`

Função `scheduleAutoRun(uri, controller)` que, após o debounce, chama o fluxo
existente `runForUri(controller, uri, coverage)` (coverage conforme a PRD-54
se aplicável). Extrair a lógica de debounce para um módulo puro
(`autoRun.ts`) testável sem `vscode` (recebe `setTimeout` injetado).

### 5.3 `src/config.ts`

Adicionar `autoRunEnabled` e `autoRunDelayMs` ao retorno de `readConfig()`.

## 6. Configuração

Novas settings `utplsql.autoRun` e `utplsql.autoRunDelayMs`. Nenhum comando
novo (comportamento disparado por save). A PRD-54 (toggle de cobertura) pode
herdar a flag de cobertura.

## 7. Plano de testes

- **Unitários** (`autoRun.test.ts`): debounce coalesce múltiplos saves; arquivos
  distintos não se cancelam; `.pkb`/não-`.pks` são ignorados; modo `off` não
  agenda.
- **Integração**: salvar `.pks` → suites do arquivo re-executam automaticamente;
  salvar arquivo não-`.pks` → nada acontece.
- **Validação manual**: salvar durante execução → sem execução concorrente
  duplicada.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Resultado *stale*: teste roda contra objeto não recompilado no banco | Documentar claramente; utPLSQL-cli já recompila os packages de teste antes de rodar no modo CLI; no modo Oracle direto, avisar no output se detectar `ORA-` de objeto inválido. Recompilar automaticamente é fora de escopo. |
| Custo de BD por save (cada save = uma execução no Oracle) | Debounce 500ms default + setting `onSave` (não `onChange`); guarda de concorrência. |
| Disparo acidental em CI/ambientes remotos | Default `off`; habilitar só por workspace via `settings.json`. |

## 9. Rollout

- Release 0.14.0 (minor).
- CHANGELOG: "Auto-run on save: re-executa as suites do `.pks` salvo
  (`utplsql.autoRun`)".
- Publicar via release no GitHub.

## 10. Critérios de aceite

- `npm test` passa.
- `utplsql.autoRun: off` (default) não altera o comportamento atual.
- `utplsql.autoRun: onSave` re-executa as suites do arquivo salvo.
- Debounce evita execuções duplicadas em saves rápidos.
- Salvar `.pkb`/outros não dispara nada.
- Documentado no README (tabela de config + Troubleshooting).

## 11. Questões em aberto

- Estender a `onChange` (digitar sem salvar)? — Follow-up se houver demanda.
- Auto-run com cobertura por padrão? — Casado com a PRD-54 (toggle).
- Recompilar automaticamente o package antes de rodar no modo Oracle direto?
  — Avaliar como follow-up separado (hoje o CLI recompila; o direto, não).
