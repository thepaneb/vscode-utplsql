---
id: SEC-006
tipo: seguranca
titulo: Nome de reporter é sanitizado antes de ir ao PL/SQL
dominio: injecao
status: ativo
severidade: alta
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:552", "src/oracleRunner.ts:560", "src/oracleRunner.ts:568"]
testes: ["src/test/unit/oracleRunner.test.ts"]
regras: ["BR-EXEC-014"]
tags: ["seguranca", "injecao"]
---
## Enunciado

Um reporter adicional só entra no run se o nome normalizado casar ^[a-z0-9_]+$, não duplicar reporter base/cobertura e existir na lista do banco; caso contrário é ignorado com aviso.

## Controle

Validação por regex + checagem em get_reporters_list antes de concatenar no PL/SQL.

## Justificativa

O nome vem de settings e seria concatenado; a regex impede injeção e reporter inexistente (que abortaria o run).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📐 Regras: [[BR-EXEC-014 - Reporters adicionais são validados e sanitizados antes do PL-SQL|BR-EXEC-014]]
<!-- brain:auto:end -->
