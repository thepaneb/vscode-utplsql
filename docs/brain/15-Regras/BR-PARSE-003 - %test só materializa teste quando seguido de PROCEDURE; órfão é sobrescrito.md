---
id: BR-PARSE-003
tipo: regra
titulo: %test só materializa teste quando seguido de PROCEDURE; órfão é sobrescrito
dominio: parser
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/suiteParser.ts:88", "src/suiteParser.ts:123", "src/suiteParser.ts:124", "src/suiteParser.ts:135"]
testes: ["src/test/unit/suiteParser.test.ts"]
tags: ["parser"]
---
## Enunciado

Cada %test guarda uma descrição pendente e o teste só é adicionado ao atingir uma linha com procedure <nome>; se outro %test aparecer antes, a descrição pendente é substituída e o anterior é descartado.

## Pré-condições

Linhas processadas em ordem; o estado seenFirstTest controla a coleta de annotations.

## Exceções

%test sem PROCEDURE seguinte não gera teste; o último %test pendente vence.

## Justificativa

Evita criar itens fantasma para annotations sem procedure correspondente.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
<!-- brain:auto:end -->
