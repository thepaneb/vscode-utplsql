---
id: ERR-010
aliases: [ERR-010]
tipo: erro
titulo: Erro genérico do ut_runner.run (runner.oracleError)
dominio: execucao
codigo: runner.oracleError
status: ativo
severidade: alta
verificado: 2026-09-23
implementacao: ["src/runner.ts", "src/oracleRunner.ts:785"]
testes: ["src/test/unit/runner.test.ts"]
regras: ["BR-EXEC-009"]
tags: [erros, execucao]
---
## Sintoma

A execução termina com erro e a mensagem do Oracle é exibida no output/notificação.

## Causa

Qualquer falha levantada dentro de ut_runner.run (erro de configuração, objeto inválido, exceção não capturada no teste).

## Correção

Ler a mensagem do Oracle e o stack; verificar setup/compilação e os demais diagnósticos. A extensão faz o parsing do XML e aplica resultados parciais.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
- 📐 Regras: [[BR-EXEC-009 - Separação do XML de cobertura do XML JUnit no mesmo buffer|BR-EXEC-009]]
<!-- brain:auto:end -->
