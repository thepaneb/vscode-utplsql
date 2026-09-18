# Workspace vazio para o teste de thick mode

Este diretório existe apenas como `workspaceFolder` do
`test:integration:thick` (`.vscode-test.thick.mjs`). Fica **sem** arquivos
`.pks`/`.pkb` de propósito: assim a extensão **não** auto-ativa (o
`activationEvents` é `workspaceContains:**/*.pks`), evitando que uma conexão
thin seja criada antes de o teste inicializar o thick mode (NJS-118).

O teste chama `ensureOracleClient(..., 'thick', ...)` diretamente, sem ativar a
extensão — o objeto é validar o driver/Instant Client, não o fluxo da extensão.
