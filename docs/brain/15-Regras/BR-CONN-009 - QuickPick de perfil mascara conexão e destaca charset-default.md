---
id: BR-CONN-009
aliases: [BR-CONN-009]
tipo: regra
titulo: QuickPick de perfil mascara conexão e destaca charset/default
dominio: conexao
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/connectionProfiles.ts:236", "src/connectionProfiles.ts:247"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
prds: ["PRD-34"]
requisitos: ["PRD-34/RF4"]
tags: ["conexao"]
---
## Enunciado

Se selectProfile monta os itens, então a description mostra a conexão mascarada e adiciona o charset apenas quando setado e diferente de utf8, e o detail combina description e o rótulo de padrão quando isDefault.

## Pré-condições

Pelo menos um perfil disponível.

## Exceções

Charset ausente ou utf8 não gera sufixo; detail vazio vira undefined.

## Justificativa

Exibir contexto legível sem expor senha e sinalizar perfis não-utf8 e o perfil padrão.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]]
- 🎯 Requisitos: [[prd-34-multi-connection-profiles|PRD-34 RF4]]
- 🧩 Código: [[COD - connectionProfiles.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]]
- ↩️ Referenciada por: [[09-configuration]] · [[SEC-002 - Connection string é sempre mascarada em qualquer saída|SEC-002]]
<!-- brain:auto:end -->
