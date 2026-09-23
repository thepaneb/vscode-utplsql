---
id: BR-SCHEMA-002
tipo: regra
titulo: extractSchemaFromPath - path.posix.relative e placeholder {schema}
dominio: schema
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/discovery.ts:100", "src/discovery.ts:111", "src/discovery.ts:116", "src/discovery.ts:123", "src/testTree.ts:76"]
testes: ["src/test/unit/discovery.test.ts"]
tags: ["schema"]
---
## Enunciado

O schema é extraído com path.posix.relative(workspace, file) após normalizar barras invertidas e a letra de drive; o padrão tem os metacaracteres escapados e {schema} vira ([^/]+), ** vira .* e * vira [^/]*; o grupo capturado é retornado em MAIÚSCULAS.

## Pré-condições

schemaPattern contendo {schema} e arquivo sob o workspace.

## Exceções

Drive divergente entre arquivo e workspace resulta em undefined; caminho relativo começando com .. resulta em undefined; padrão sem {schema} resulta em undefined e o caller usa UNKNOWN.

## Justificativa

Cross-platform (Windows/WSL) e o {schema} delimita a captura; sem placeholder não há como inferir o schema.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
<!-- brain:auto:end -->
