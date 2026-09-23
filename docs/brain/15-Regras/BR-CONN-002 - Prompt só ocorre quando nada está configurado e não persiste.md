---
id: BR-CONN-002
tipo: regra
titulo: Prompt só ocorre quando nada está configurado e não persiste
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/config.ts:205", "src/config.ts:222"]
testes: ["src/test/unit/config.test.ts"]
tags: ["conexao"]
---
## Enunciado

Se nenhum nível de configuração/ambiente/cache resolve a conexão, então a extensão pergunta via InputBox com password=true e, se o usuário digitar, guarda o valor apenas em memória (sessionConnection), nunca em settings.

## Pré-condições

resolveConnection() chamado em fluxo interativo e todos os níveis de resolveConnectionNoPrompt retornam vazio.

## Exceções

Cancelamento ou entrada vazia (após trim) retorna undefined e não grava nada; o cache é descartado ao recarregar a janela.

## Justificativa

Evitar que a senha do usuário seja gravada em settings e limitar a exposição do segredo ao ciclo de vida da sessão.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
<!-- brain:auto:end -->
