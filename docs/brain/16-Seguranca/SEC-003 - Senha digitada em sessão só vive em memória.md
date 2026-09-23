---
id: SEC-003
aliases: [SEC-003]
tipo: seguranca
titulo: Senha digitada em sessão só vive em memória
dominio: segredos
status: ativo
severidade: alta
verificado: 2026-09-23
implementacao: ["src/config.ts:205", "src/config.ts:222", "src/config.ts:224"]
testes: ["src/test/unit/config.test.ts"]
regras: ["BR-CONN-002", "BR-CONN-003"]
tags: ["seguranca", "conexao"]
---
## Enunciado

Quando a conexão é digitada no prompt, o valor é guardado apenas em memória (sessionConnection) e descartado ao recarregar a janela; nunca vai para settings.

## Controle

resolveConnection usa InputBox com password=true e clearSessionConnection limpa o cache e reseta utplsql:connected.

## Justificativa

Minimizar a exposição do segredo ao ciclo de vida da sessão.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📐 Regras: [[BR-CONN-002 - Prompt só ocorre quando nada está configurado e não persiste|BR-CONN-002]] · [[BR-CONN-003 - Limpar conexão de sessão reseta o context key|BR-CONN-003]]
<!-- brain:auto:end -->
