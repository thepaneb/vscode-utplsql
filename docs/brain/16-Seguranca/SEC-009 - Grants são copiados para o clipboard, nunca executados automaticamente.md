---
id: SEC-009
aliases: [SEC-009]
tipo: seguranca
titulo: Grants são copiados para o clipboard, nunca executados automaticamente
dominio: privilegio
status: ativo
severidade: media
verificado: 2026-09-23
implementacao: ["src/commands/utility.ts:13", "src/quickfix.ts:157", "src/viewCoverage.ts:122"]
testes: ["src/test/unit/quickfix.test.ts"]
regras: ["BR-COB-001", "BR-COB-003"]
tags: ["seguranca", "privilegio"]
---
## Enunciado

A extensão não concede privilégios: quando falta GRANT EXECUTE ON SYS.DBMS_PROFILER (ou SELECT ON V$SQL), o comando utplsql.copyGrantsToClipboard copia o DDL para o usuário executar.

## Controle

quick-fix UTPLSQL_NO_COVERAGE → copyGrantsToClipboard; viewCoverage apenas avisa quando V$SQL é negado.

## Justificativa

Princípio do menor privilégio — a extensão não deve executar DDL privilegiado em nome do usuário.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📐 Regras: [[BR-COB-001 - Cobertura Oracle exige GRANT EXECUTE ON SYS.DBMS_PROFILER|BR-COB-001]] · [[BR-COB-003 - Cobertura de views via V$SQL é opt-in e best-effort|BR-COB-003]]
- 🧩 Código: [[COD - utility.ts]] · [[COD - quickfix.ts]] · [[COD - viewCoverage.ts]]
- 🧪 Testes: [[TST - quickfix.test.ts]]
<!-- brain:auto:end -->
