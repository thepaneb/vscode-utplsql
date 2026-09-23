---
id: BR-UI-007
tipo: regra
titulo: Diagnósticos de setup e quick-fixes restritos ao source utPLSQL Setup
dominio: diagnostico
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/quickfix.ts:28", "src/quickfix.ts:35", "src/quickfix.ts:133", "src/quickfix.ts:139", "src/quickfix.ts:150", "src/quickfix.ts:304", "src/extension.ts:109"]
testes: ["src/test/unit/quickfix.test.ts", "src/test/unit/quickfixActivation.test.ts"]
prds: ["PRD-32"]
requisitos: ["PRD-32/RF1", "PRD-32/RF4"]
tags: ["diagnostico"]
---
## Enunciado

Os diagnósticos de setup são publicados numa DiagnosticCollection própria (utplsql-setup) sob a URI virtual utplsql-setup:diagnostics com source utPLSQL Setup; o CodeActionProvider ignora qualquer diagnóstico cujo source não seja exatamente esse e mapeia ações por código (UTPLSQL_BAD_CONN, UTPLSQL_NO_COVERAGE, UTPLSQL_THICK_MODE, UTPLSQL_INVALID_OBJECTS).

## Pré-condições

utplsql.setupDiagnostics.enabled true e existir fonte de conexão para a maioria das validações.

## Exceções

validateOnActivation retorna vazio se setupDiagnosticsEnabled for false; validação de thick só roda no modo thick; erros de conexão usam resolveConnectionNoPrompt (nunca pede prompt).

## Justificativa

Isola problemas de configuração dos problemas do código do usuário e evita que outros providers misturem diagnostic sources.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-32-quickfix-setup-diagnostics|PRD-32]]
- 🎯 Requisitos: [[prd-32-quickfix-setup-diagnostics|PRD-32 RF1]] · [[prd-32-quickfix-setup-diagnostics|PRD-32 RF4]]
- ↩️ Referenciada por: [[07-diagnostics-and-validation]] · [[ERR-006 - UTPLSQL_INVALID_OBJECTS — objetos UT3 inválidos no banco|ERR-006]] · [[SEC-010 - Fluxos não interativos nunca abrem prompt de conexão|SEC-010]]
<!-- brain:auto:end -->
