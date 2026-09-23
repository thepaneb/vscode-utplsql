---
id: SEC-007
tipo: seguranca
titulo: Cobertura não aceita caminho fora das raízes do workspace
dominio: path-traversal
status: ativo
severidade: alta
verificado: 2026-09-23
implementacao: ["src/coverage.ts:26", "src/coverage.ts:48", "src/coverage.ts:63"]
testes: ["src/test/unit/coverage.test.ts"]
regras: ["BR-COB-002"]
tags: ["seguranca", "path-traversal"]
---
## Enunciado

O filename vindo do XML de cobertura só é resolvido se o caminho resultante estiver dentro de folderRoot ou workspaceRoot; candidatos fora são rejeitados.

## Controle

resolveSourceUri testa folderRoot/workspaceRoot/sourcePath e descarta qualquer caminho que escape das raízes.

## Justificativa

O XML vem do banco (conteúdo não confiável); sem o limite, um filename malicioso poderia apontar para fora do workspace.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📐 Regras: [[BR-COB-002 - resolveSourceUri tenta variantes de extensão e bloqueia path traversal|BR-COB-002]]
<!-- brain:auto:end -->
