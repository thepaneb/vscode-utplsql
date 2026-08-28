# Plano de execução — versão 0.11.0

| Campo | Valor |
|---|---|
| Data | 2026-08-26 |
| Branch | `release/v0.11.0` |
| PRDs | 21, 44, 45, 41, 43 |

## Ordem de execução

| Ordem | PRD | Esforço | Complexidade | Por quê |
|---|---|---|---|---|
| 1 | 44 — Pure Matching | 0,5–1 dia | Baixa | Win rápido, refactor puro sem mudança de comportamento. Libera `runner.ts`/`oracleRunner.ts` cedo, reduzindo conflitos para 41/43. |
| 2 | 21 — Workflows CI/CD | 0,5–1 dia | Baixa | Rápido e de baixo risco. Pré-requisito do 45 (divide `package.json`/`publish.yml`). CI limpo antes de mexer em build. |
| 3 | 45 — esbuild Bundling | 1–2 dias | Média | Muda `main` → `dist/`. Entrando cedo, todo o dev restante (41/43) roda sobre o artefato real — mais tempo de "soak" antes do release. Plano B (podar módulos thick) já documentado. |
| 4 | 41 — Verificação instalação UT3 | 1–2 dias | Média | Escopo menor que 43 e toca `oracleRunner.ts`/`extension.ts`. Unit-testável com mock — não depende de banco real. |
| 5 | 43 — Descoberta via DB | 2–3 dias | Média-Alta | Mais complexa e depende de Oracle real na integração. Por último, com `oracleRunner.ts` já estabilizado pelos itens 1/3/4. |

## Regras

- **Execução sequencial** (não paralela): 41 e 43 compartilham `oracleRunner.ts`;
  21 e 45 compartilham `package.json`/`publish.yml`.
- **Gates por PRD**: `npm run compile && npm run lint && npm run test:unit` verdes +
  critérios de aceite do próprio PRD.
  - 45 exige ainda `npm run package` + `vsce ls` sem binários nativos;
  - 43 exige integração com banco real.
- **Sugestão**: entregar 44+21 no primeiro dia (2 wins rápidos), 45 em seguida,
  e reservar o grosso do ciclo para 41+43 (integração Oracle).

## Rotina por PRD (concluída)

1. Mover arquivo de `docs/prd/approved/` → `docs/prd/completed/`
2. Preencher coluna Versão na tabela do `index.md` (mover linha p/ 🟢 Concluídos)
3. Atualizar árvore Estrutura no `index.md`
4. Entry no `CHANGELOG.md`
5. Rodar `sync-prds` (fecha issue, label `prd:completed`)

## Observações

- PRD-41 e PRD-43 citam PRD-38 (Connection Pooling) como dependência — **já concluído** na 0.10.0.
- Antes do release 0.11.0: atualizar README (config/Comandos/Keybindings/Troubleshooting se houver mudanças), `npm run package` e publicação exclusivamente via GitHub release.
