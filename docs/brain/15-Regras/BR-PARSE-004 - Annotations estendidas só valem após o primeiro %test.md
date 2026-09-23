---
id: BR-PARSE-004
tipo: regra
titulo: Annotations estendidas só valem após o primeiro %test
dominio: parser
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/suiteParser.ts:95", "src/suiteParser.ts:96", "src/suiteParser.ts:118", "src/suiteParser.ts:119"]
testes: ["src/test/unit/suiteParser.test.ts", "src/test/unit/discovery.test.ts"]
tags: ["parser"]
---
## Enunciado

Enquanto seenFirstTest é false, um %disabled marca a suíte como disabled; após o primeiro %test, %disabled aplica-se ao teste pendente e %throws/%tags/%displayname só são coletados dentro desse bloco pendente.

## Pré-condições

Ordem das annotations relativa ao primeiro %test no arquivo.

## Exceções

%disabled entre procedimentos aplica-se ao próximo %test (não ao anterior); suíte ou teste disabled são removidos da descoberta.

## Justificativa

Retrocompatibilidade do PRD-42: a mesma annotation tem semântica posicional diferente antes/depois do primeiro teste.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
<!-- brain:auto:end -->
