---
id: BR-LOG-001
aliases: [BR-LOG-001]
tipo: regra
titulo: Diagnóstico vai para o LogOutputChannel utPLSQL com nível controlável
dominio: diagnostico
status: ativo
severidade: baixa
fonte: codigo
verificado: 2026-09-29
implementacao: ["src/logger.ts:12", "src/logger.ts:17", "src/logger.ts:26", "src/extension.ts:41", "src/extension.ts:43", "src/test/vscode-stub.ts:567"]
testes: ["src/test/unit/logger.test.ts"]
relacionado: ["BR-CONN-014", "PAT-001"]
tags: ["diagnostico"]
---
## Enunciado

O `logger` (módulo **puro**, sem `vscode`) encaminha cada evento a um *sink*
opcional. Na ativação, `extension.ts` cria o `LogOutputChannel` **`utPLSQL`**
(`createOutputChannel('utPLSQL', { log: true })`) e o registra como sink,
formatando `mensagem + contexto JSON` (`formatLogLine`). O nível exibido é
controlado pelo usuário no painel **Output** (Trace/Debug/Info/Warning/Error).

A emissão ao **console** segue gateada por `UTPLSQL_DEBUG=1` (ver
[[BR-CONN-014 - Log de debug é opt-in por variável de ambiente]]); o canal é o
caminho de diagnóstico em campo, sem variável de ambiente. O sink **nunca lança**
e **nunca recebe credenciais**.

## Pré-condições

Extensão ativa (o sink é definido em `activate`). O `logger` continua sem importar
`vscode` ([[PAT-001 - Módulos puros vs dependentes de vscode]]).

## Exceções

Sem sink (testes/CLI), o log segue apenas no console — igual ao comportamento
anterior. Contexto não serializável é omitido em vez de lançar.

## Justificativa

Permitir diagnóstico em produção (nível ajustável pela UI) sem depender de
`UTPLSQL_DEBUG`, preservando o módulo de log **puro e testável**.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 🧩 Código: [[COD - logger.ts]] · [[COD - extension.ts]] · [[COD - vscode-stub.ts]]
- 🧪 Testes: [[TST - logger.test.ts]]
- 🔗 BR-CONN-014 · PAT-001
<!-- brain:auto:end -->
