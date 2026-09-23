---
id: BR-EXEC-014
tipo: regra
titulo: Reporters adicionais são validados e sanitizados antes do PL/SQL
dominio: execucao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:552", "src/oracleRunner.ts:556", "src/oracleRunner.ts:560", "src/oracleRunner.ts:568", "src/oracleRunner.ts:578"]
testes: ["src/test/unit/oracleRunner.test.ts:863", "src/test/unit/oracleRunner.test.ts:893"]
tags: ["execucao", "seguranca"]
---
## Enunciado

Se um reporter adicional é configurado, então só é incluído no run quando seu nome normalizado casa ^[a-z0-9_]+$, não duplica um reporter base/cobertura e existe na lista de reporters; nomes inválidos ou desconhecidos são ignorados com aviso, sem abortar o run.

## Pré-condições

additionalReporters da config e/ou reporter volátil de sessão (consumo único).

## Exceções

Se a lista de reporters do banco estiver indisponível (vazia), a validação de existência é pulada e o nome válido é aceito.

## Justificativa

O nome vem de settings (potencialmente do workspace) e é concatenado no PL/SQL; sem a regex/validação haveria injeção ou run abortado por reporter inexistente.

