---
id: BR-COB-002
tipo: regra
titulo: resolveSourceUri tenta variantes de extensão e bloqueia path traversal
dominio: cobertura
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/coverage.ts:6", "src/coverage.ts:26", "src/coverage.ts:32", "src/coverage.ts:48", "src/coverage.ts:63"]
testes: ["src/test/unit/coverage.test.ts"]
tags: ["cobertura", "seguranca"]
---
## Enunciado

O filename do relatório de cobertura é resolvido para um Uri local tentando folderRoot (prioridade), workspaceRoot e sourcePath, e para cada caminho testando variantes de extensão (.sql, .pks, .pkb, .prc, .fnc, .trg, .tpb, .bdy, .typ) mais basename; nenhum candidato fora de folderRoot/workspaceRoot é aceito.

## Pré-condições

XML de cobertura com <filename> (normalmente mapeado para .sql por mapDbPathsToFiles).

## Exceções

Retorna undefined se nada existir/ser arquivo ou se o caminho resolver para fora das raízes.

## Justificativa

O relatório sempre traz .sql, mas o arquivo real pode usar outra extensão PL/SQL; e o XML é conteúdo do banco, não confiável (mitiga path traversal).

