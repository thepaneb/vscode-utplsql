---
id: PAT-001
tipo: padrao
titulo: "Módulos puros vs dependentes de vscode"
dominio: arquitetural
categoria: arquitetural
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["arquitetural"]
---
## Intenção

Separar a lógica testável (parse, matching, tipos, i18n) da camada que depende da
API do VSCode, para permitir `node --test` sem Extension Host.

## Como se aplica

Módulos como `suiteParser`, `junit`, `cobertura`, `matching`, `plsqlDeclarations`,
`state`, `types`, `scriptRunner` e `logger` não importam `vscode`. Os que importam
(`extension`, `runner`, `config`, `discovery`, `coverage`, `oracleRunner`,
`results`, `testTree`, `decorations`, `statusBar`, `quickfix`, `commands/`) são
cobertos por teste de integração ou pelo stub.

## Consequências

- **Positivas:** maioria do domínio coberta por unitários rápidos.
- **Negativas:** exige disciplina e o stub de vscode.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Padroes]]
<!-- brain:auto:end -->
