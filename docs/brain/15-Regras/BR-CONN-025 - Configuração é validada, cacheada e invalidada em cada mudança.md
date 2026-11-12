---
id: BR-CONN-025
aliases: [BR-CONN-025]
tipo: regra
titulo: Configuração é validada, cacheada e invalidada em cada mudança
dominio: conexao
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-11
implementacao: ["src/config.ts", "src/configValidation.ts", "src/configCache.ts", "src/tnsnames.ts", "src/connectionProfiles.ts", "src/extension.ts"]
testes: ["src/test/unit/configValidation.test.ts", "src/test/unit/configCache.test.ts", "src/test/unit/config.test.ts", "src/test/unit/tnsnames.test.ts", "src/test/integration/v021-features.test.ts"]
prds: ["PRD-130"]
requisitos: ["PRD-130/RF1", "PRD-130/RF5", "PRD-130/RNF1", "PRD-130/RNF2"]
tags: ["configuracao", "cache"]
---
## Enunciado

`readConfig()` devolve um snapshot validado e cacheado. Valores inválidos viram
o default seguro (com `logger.warn` e sem logar segredos), o pool nunca fica
abaixo de 2 nem com `min > max`, e o cache é invalidado por mudança de setting,
perfil ativo, conexão ou senha da wallet. O `tnsnames.ora` é cacheado por
`(path, mtime, size)`.

## Controle

`src/configValidation.ts` valida números, enums, booleanos, arrays de string e
regex; `src/configCache.ts` mantém geração + snapshot; `src/config.ts` aplica o
merge do perfil ativo depois da validação; `src/connectionProfiles.ts` e o
listener de `onDidChangeConfiguration` invalidam o cache; `readTnsnamesFile`
evita reler o arquivo TNS sem mudança.

## Justificativa

Evitar falhas obscuras por settings inválidas e o custo de reler ~50 settings
em cada item de CodeLens/árvore, mantendo o comportamento observável.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-130-config-validation-typed-errors|PRD-130]]
- 🎯 Requisitos: [[prd-130-config-validation-typed-errors|PRD-130 RF1]] · [[prd-130-config-validation-typed-errors|PRD-130 RF5]] · [[prd-130-config-validation-typed-errors|PRD-130 RNF1]] · [[prd-130-config-validation-typed-errors|PRD-130 RNF2]]
- 🧩 Código: [[COD - config.ts]] · [[COD - configValidation.ts]] · [[COD - configCache.ts]] · [[COD - tnsnames.ts]] · [[COD - connectionProfiles.ts]] · [[COD - extension.ts]]
- 🧪 Testes: [[TST - configValidation.test.ts]] · [[TST - configCache.test.ts]] · [[TST - config.test.ts]] · [[TST - tnsnames.test.ts]] · [[TST - v021-features.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-130-config-validation-typed-errors|PRD-130]]
<!-- brain:auto:end -->
