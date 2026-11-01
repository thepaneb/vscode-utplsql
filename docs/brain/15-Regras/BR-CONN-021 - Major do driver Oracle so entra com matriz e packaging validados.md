---
id: BR-CONN-021
aliases: [BR-CONN-021]
tipo: regra
titulo: Major do driver Oracle só entra com matriz e packaging validados
dominio: conexao
status: ativo
severidade: alta
interno: true
fonte: codigo
verificado: 2026-10-31
implementacao: ["package.json", ".github/dependabot.yml", "scripts/package-target.cjs", "scripts/db-matrix/run.sh"]
testes: ["src/test/unit/packageTarget.test.ts", "src/test/unit/matrixConfig.test.ts", "src/test/integration/thickLegacyE2E.test.ts"]
prds: ["PRD-124"]
requisitos: ["PRD-124/RF0", "PRD-124/RF1", "PRD-124/RF3", "PRD-124/RF4"]
relacionado: ["[[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL]]", "[[BR-CONN-019 - Oracle 11g (11.2) exige thick mode; thin tem piso 12.1]]", "[[TPL-ORACLEDB - node-oracledb]]"]
tags: ["conexao", "oracle", "driver"]
---
## Enunciado

Um **major** do `oracledb` (ex.: 7 → 26) não entra como bump automático do
Dependabot. Antes do merge:

1. spike **GO/NO-GO** com a matriz real (23free full, 11g thick, 12.2/21xe
   smoke) e unitários/cobertura;
2. packaging dos **9 alvos** validado (4 com glue do alvo, 5 sem `.node`,
   tamanho ≤ 10% vs versão anterior);
3. `@types/oracledb` na mesma major e `typecheck`/`lint` verdes.

O `ignore` de major do Dependabot permanece para que o próximo major também
passe por PRD.

## Pré-condições

`matrix.env`/`scripts/db-matrix/run.sh` funcionando com Docker e Instant Client
19c+ para o eixo thick.

## Exceções

Patches/minors do driver seguem o fluxo normal do Dependabot. Um NO-GO mantém a
versão anterior e registra a evidência na PRD/issue.

## Justificativa

O driver está no caminho de toda execução, cobertura, debugger e pooling; uma
regressão silenciosa em LOB/resultset/streaming aparece como falha
intermitente, não no `typecheck`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-124-oracledb-26-upgrade|PRD-124]]
- 🎯 Requisitos: [[prd-124-oracledb-26-upgrade|PRD-124 RF0]] · [[prd-124-oracledb-26-upgrade|PRD-124 RF1]] · [[prd-124-oracledb-26-upgrade|PRD-124 RF3]] · [[prd-124-oracledb-26-upgrade|PRD-124 RF4]]
- 🧩 Código: [[COD - package.json]] · [[COD - dependabot.yml]] · [[COD - package-target.cjs]] · [[COD - run.sh]]
- 🧪 Testes: [[TST - packageTarget.test.ts]] · [[TST - matrixConfig.test.ts]] · [[TST - thickLegacyE2E.test.ts]]
- 🔗 [[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL]] · [[BR-CONN-019 - Oracle 11g (11.2) exige thick mode; thin tem piso 12.1]] · [[TPL-ORACLEDB - node-oracledb]]
- ↩️ Referenciada por: [[10-development-tooling]] · [[DEP-oracledb - node-oracledb|DEP-oracledb]] · [[TPL-ORACLEDB - node-oracledb|TPL-ORACLEDB]] · [[prd-124-oracledb-26-upgrade|PRD-124]]
<!-- brain:auto:end -->
