# Plano de execução — versão 0.12.0

| Campo | Valor |
|---|---|
| Data | 2026-09-04 |
| Branch | `release/v0.12.0` |
| PRDs | 34, 48, 12, 33, 49 |

## Ordem de execução

| Ordem | PRD | Esforço | Complexidade | Por quê |
|---|---|---|---|---|
| 1 | 34 — Multi-Connection Profiles | 3–5 dias | Média | Fundação: mexe em `resolveConnection`/`config.ts`/`state.ts`, que 12 e 33 consomem. Entrar cedo estabiliza o fluxo de conexão para o resto do ciclo. |
| 2 | 48 — Function Coverage | 1–2 dias | Média | Win rápido, majoritariamente puro (`plsqlDeclarations.ts` + `results.ts`/`cobertura.ts`). Estabiliza o pipeline de cobertura antes do 12, que também mexe em cobertura. |
| 3 | 12 — SQL Coverage (views) | 2–3 dias | Média-Alta | Constrói sobre o pipeline de cobertura do 48 e sobre os perfis do 34 (`V$SQL` + `type_mapping`). Exige Oracle real na integração. |
| 4 | 33 — PL/SQL Debugger | 8–12 dias | Alta | Maior item: novo `debugger.ts` + integração com `runner.ts`/`extension.ts`. Majoritariamente aditivo — entra depois de 34/48/12 estabilizarem conexão e runner. |
| 5 | 49 — i18n | 2–3 dias | Média-Alta | Toca todos os módulos (`extension`, `runner`, `oracleRunner`, `quickfix`, `compilationDiagnostics`, `cli`, `statusBar`, `results`). Por último: evitar conflito com qualquer feature em andamento. |

## Regras

- **Execução sequencial** (não paralela): 12 e 48 compartilham o pipeline de
  cobertura (`results.ts`/`cobertura.ts`); 34, 33 e 49 compartilham
  `config.ts`/`runner.ts`/`extension.ts`; 49 reescreve strings em quase todos.
- **Gates por PRD**: `npm run compile && npm run lint && npm run test:unit`
  verdes + critérios de aceite do próprio PRD.
  - 12 exige integração com banco real (views + `V$SQL`);
  - 33 exige integração com banco real (`DBMS_DEBUG`, breakpoints/stepping);
  - 34 e 48 não dependem de banco real (unit + mock).
- **Sugestão**: entregar 48 no primeiro dia (win rápido) e iniciar 34 em
  seguida; reservar a maior fatia do ciclo para o 33.

## Rotina por PRD (concluída)

1. Mover arquivo de `docs/prd/approved/` → `docs/prd/completed/`
2. Preencher coluna Versão na tabela do `index.md` (mover linha p/ 🟢 Concluídos)
3. Atualizar árvore Estrutura no `index.md`
4. Entry no `CHANGELOG.md`
5. Rodar `sync-prds` (fecha issue, label `prd:completed`)

## Observações

- **PRD-47 (Node 26 no toolchain) foi adiada para a 0.13.0** — o LTS do Node 26
  chega em out/2026, próximo demais do ciclo da 0.12.0; executar como current
  geraria CI flaky (gate de data do próprio PRD). Permanece em `proposed/`.
- PRD-33 e PRD-34 citam funcionalidades de concorrentes (Nexo SQL Studio,
  dbFlux) como referência de UX — revisar os critérios de aceite antes de
  iniciar cada uma.
- Antes do release 0.12.0: atualizar README (config/Comandos/Keybindings/
  Troubleshooting se houver mudanças — obrigatório após 49), `npm run package`
  e publicação exclusivamente via GitHub release.

## Segunda onda — PRDs 65–68 (aprovadas em 2026-09-15)

| Ordem | PRD | Esforço | Complexidade | Por quê |
|---|---|---|---|---|
| 1 | 65 — Schema-mode + segurança | 2–3 dias | Média-Alta | Fundação: split de credenciais (RF4) e formato de perfil (SecretStorage) que a 66 consome. Mexe em `oracleRunner`/`connectionProfiles` cedo. |
| 2 | 66 — Conexão, logging e cache | 2–3 dias | Média | Constrói sobre o split da 65 (RF4→RF3) e fornece `withOracleConnection` que a 65 RF1 usa. Cache de config + invalidação de pool. |
| 3 | 68 — Religar diagnostics/reporter | 2–3 dias | Média | Independente, mas precisa vir **antes da 67** (a 67 remove o branch `UTPLSQL_BAD_CONN`, que a 68 passa a produzir). Reativa docs hoje marcadas como inativas. |
| 4 | 67 — Qualidade, limpeza e performance | 3–4 dias | Média | Refactor amplo de `extension.ts` (`src/commands/`) + remoção de código morto + i18n + debounce. Por último para rebasear em 65/66/68. |

Planos detalhados: `.opencode/plans/prd-65-*.md`, `prd-66-*.md`, `prd-68-*.md`,
`prd-67-*.md`.

### Regras da segunda onda

- **Sequencial** (não paralela): 65 e 66 compartilham `oracleRunner.ts`/
  `connectionProfiles.ts`; 67 refatora `extension.ts`, tocado por todas.
- **Ordem crítica 68 → 67**: a 67 deve **preservar** o produtor de
  `UTPLSQL_BAD_CONN` criado pela 68.
- **Gates por PRD**: `npm run compile && npm run lint && npm run test:unit` verdes
  + critérios de aceite. Banco real obrigatório em 65 RF1/65 RF3, 66 RF6 e 68 RF1/RF3.
- **Docs**: 65 (formato de perfis), 66 (`UTPLSQL_DEBUG`) e 67
  (`utplsql.refreshDebounceMs`) exigem atualização de README/wiki + revalidar 68
  (reativar compilation diagnostics na doc). Rodar `docs:check` + `brain:sync`.
- **Release**: somar ao release 0.12.0; `CHANGELOG.md` por PRD.
