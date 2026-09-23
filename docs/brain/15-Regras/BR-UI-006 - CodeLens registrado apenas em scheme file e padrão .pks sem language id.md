---
id: BR-UI-006
tipo: regra
titulo: CodeLens registrado apenas em scheme file e padrão .pks sem language id
dominio: ui
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/extension.ts:85", "package.json:672"]
testes: ["src/test/unit/codelens.test.ts"]
prds: ["PRD-24"]
requisitos: ["PRD-24/RF1"]
tags: ["ui", "codelens"]
---
## Enunciado

O CodeLens é registrado com selector scheme file e pattern **/*.pks, sem language plsql, pois .pks não possui language ID padrão garantido no VSCode.

## Pré-condições

Arquivo local com extensão .pks.

## Exceções

.pkb não recebe CodeLens (apenas .pks); documentos de outro scheme ficam fora.

## Justificativa

Registrar por language impediria o provider de casar em ambientes cujo ID de linguagem PL/SQL não está definido.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-24-codelens-integration|PRD-24]]
- 🎯 Requisitos: [[prd-24-codelens-integration|PRD-24 RF1]]
- ↩️ Referenciada por: [[05-ux-components]]
<!-- brain:auto:end -->
