---
id: BR-EXEC-016
aliases: [BR-EXEC-016]
tipo: regra
titulo: Auto-run on save - default off, debounce por arquivo e guarda de concorrência
dominio: execucao
status: proposta
severidade: alta
fonte: codigo
verificado: 2026-10-02
implementacao: []
testes: []
prds: ["PRD-50"]
requisitos: ["PRD-50/RF1", "PRD-50/RF2", "PRD-50/RF3", "PRD-50/RF4", "PRD-50/RNF1", "PRD-50/RNF2"]
tags: ["execucao", "watch"]
---

# BR-EXEC-016 — Auto-run on save - default off, debounce por arquivo e guarda de concorrência

## Enunciado

Com `utplsql.autoRun` = `off` (default) salvar `.pks` não executa nada; com
`onSave`, `onDidSaveTextDocument` agenda por arquivo (mapa `uri → timer`,
coalescendo saves rápidos, sem cancelar arquivos distintos); havendo execução em
andamento aplica `utplsql.autoRunQueue` (default `skip`) e reusa `runForUri`
respeitando o `runnerMode` (BR-EXEC-001) e a flag de cobertura (BR-COB-006).

## Pré-condições

Documento `.pks` pertencente ao workspace e com suites descobertas.

## Exceções

Arquivos `.pkb`/não-`.pks` são ignorados; auto-run não dispara prompt de conexão
em fluxo não interativo (SEC-010); não recompila o package no modo Oracle direto
(resultado *stale* documentado).

## Justificativa

Fechar o ciclo TDD sem clique manual, com custo de BD controlado por debounce,
default `off` e guarda de concorrência.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-50-auto-run-on-save|PRD-50]]
- 🎯 Requisitos: [[prd-50-auto-run-on-save|PRD-50 RF1]] · [[prd-50-auto-run-on-save|PRD-50 RF2]] · [[prd-50-auto-run-on-save|PRD-50 RF3]] · [[prd-50-auto-run-on-save|PRD-50 RF4]] · [[prd-50-auto-run-on-save|PRD-50 RNF1]] · [[prd-50-auto-run-on-save|PRD-50 RNF2]]
- ↩️ Referenciada por: [[prd-50-auto-run-on-save|PRD-50]]
<!-- brain:auto:end -->
