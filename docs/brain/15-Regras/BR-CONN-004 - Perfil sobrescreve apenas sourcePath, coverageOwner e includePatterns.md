---
id: BR-CONN-004
aliases: [BR-CONN-004]
tipo: regra
titulo: Perfil sobrescreve apenas sourcePath, coverageOwner e includePatterns
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/connectionProfiles.ts:218", "src/connectionProfiles.ts:226", "src/config.ts:160"]
testes: ["src/test/unit/connectionProfiles.test.ts", "src/test/unit/config.test.ts"]
prds: ["PRD-34"]
requisitos: ["PRD-34/RF1"]
tags: ["conexao"]
---
## Enunciado

Se existe perfil ativo, então mergeProfileConfig aplica sobre a config global somente sourcePath e coverageOwner (por truthiness) e includePatterns (por nullish), mantendo as demais chaves herdadas do global.

## Pré-condições

readConfig() encontra perfil ativo via getActiveProfile().

## Exceções

Sem perfil ativo o objeto global é retornado intacto; um campo do perfil vazio não sobrescreve o global; includePatterns vazio (lista vazia) sobrescreve por não ser nullish.

## Justificativa

Permitir cenários por ambiente (DEV/TEST/PROD) sem duplicar toda a configuração, limitando o escopo sobrescrito a campos sensíveis ao ambiente.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]]
- 🎯 Requisitos: [[prd-34-multi-connection-profiles|PRD-34 RF1]]
- 🧩 Código: [[COD - connectionProfiles.ts]] · [[COD - config.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]] · [[TST - config.test.ts]]
- ↩️ Referenciada por: [[09-configuration]] · [[ENT-005 - ConnectionProfile|ENT-005]] · [[GLOSS-007 - Connection profile|GLOSS-007]]
<!-- brain:auto:end -->
