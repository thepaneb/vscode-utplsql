---
id: BR-PARSE-010
tipo: regra
titulo: Fusão arquivo+banco - arquivo prevalece em uri/linha, banco em descrição/tags
dominio: descoberta
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/discovery.ts:344", "src/discovery.ts:349", "src/discovery.ts:355", "src/discovery.ts:361", "src/discovery.ts:362", "src/discovery.ts:365"]
testes: ["src/test/unit/discovery.test.ts"]
prds: ["PRD-74"]
requisitos: ["PRD-74/RF3"]
tags: ["descoberta"]
---
## Enunciado

mergeSuiteLists une as listas por lower(packageName); quando o package existe no arquivo, mantém uri/range/folder do arquivo, mas a descrição da suíte e dos testes vem do banco, e as tags do banco prevalecem; tags vazias no banco não apagam as do arquivo; testes só-DB são adicionados e suites só-DB entram com URI virtual.

## Pré-condições

Listas de suites de arquivo e de banco para o mesmo conjunto de schemas.

## Exceções

Descrição vazia do banco mantém a do arquivo; tags vazias no banco mantêm as do arquivo; teste presente só no banco é incluído com a linha do banco.

## Justificativa

O arquivo é necessário para abrir/editar (uri/range), enquanto o banco é a verdade após compilação (descrições/tags); evita perder dados quando o banco não traz tags.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-74-db-first-discovery|PRD-74]]
- 🎯 Requisitos: [[prd-74-db-first-discovery|PRD-74 RF3]]
<!-- brain:auto:end -->
