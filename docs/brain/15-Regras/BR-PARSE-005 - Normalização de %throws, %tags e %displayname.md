---
id: BR-PARSE-005
tipo: regra
titulo: Normalização de %throws, %tags e %displayname
dominio: parser
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/suiteParser.ts:102", "src/suiteParser.ts:107", "src/suiteParser.ts:108", "src/suiteParser.ts:113", "src/suiteParser.ts:115"]
testes: ["src/test/unit/suiteParser.test.ts"]
prds: ["PRD-42"]
requisitos: ["PRD-42/RF2", "PRD-42/RF3", "PRD-42/RF4"]
tags: ["parser"]
---
## Enunciado

%throws(-20001) e %throws(20001) resultam em expectedError=20001 (valor absoluto); %tags(a, b,) vira ['a','b'] (split por vírgula, trim, remove vazios); %displayname() vazio resulta em displayName undefined mantendo description.

## Pré-condições

Annotation dentro do bloco pendente de um %test.

## Exceções

%tags só é propagado quando há ao menos um item após o filtro; %displayname vazio não cria campo.

## Justificativa

O código de erro do Oracle pode ser declarado positivo ou negativo e tags/display name precisam de normalização estável.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-42-suiteparser-annotations|PRD-42]]
- 🎯 Requisitos: [[prd-42-suiteparser-annotations|PRD-42 RF2]] · [[prd-42-suiteparser-annotations|PRD-42 RF3]] · [[prd-42-suiteparser-annotations|PRD-42 RF4]]
- ↩️ Referenciada por: [[01-test-discovery]]
<!-- brain:auto:end -->
