---
id: BR-CONN-022
aliases: [BR-CONN-022]
tipo: regra
titulo: Ativação não abre conexão; validação de setup é preguiçosa e memoizada
dominio: conexao
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-05
implementacao: ["src/extension.ts", "src/quickfix.ts", "package.json"]
testes: ["src/test/unit/extensionActivation.test.ts", "src/test/unit/manifestDebugger.test.ts"]
prds: ["PRD-120"]
requisitos: ["PRD-120/RNF1", "PRD-120/RNF2", "PRD-120/RNF3", "PRD-120/RNF4"]
tags: [conexao, ativacao]
---

## Enunciado

A ativação da extensão **não abre conexão Oracle** e não chama a validação de
setup. A validação (`validateOnActivation` + `validateUtplsqlInstall`) roda na
primeira interação relevante (editor PL/SQL, refresh manual, expansão da árvore
ou execução), no máximo uma vez por sessão, e é invalidada por mudança de
configuração `utplsql`.

## Pré-condições

`activationEvents` restrito a `workspaceContains:**/*.{pks,pkb}` e
`onLanguage:plsql`; o comando explícito `utplsql.validateSetup` continua
disponível para forçar a checagem.

## Exceções

O comando explícito pode rodar quantas vezes o usuário quiser. Uma mudança de
configuração reinicia o memo.

## Justificativa

Remove o custo/rede do “Broad Activation” (VSCan) sem perder o diagnóstico:
quem usa PL/SQL recebe o aviso no primeiro uso; workspaces alheios não abrem
sessão Oracle.
