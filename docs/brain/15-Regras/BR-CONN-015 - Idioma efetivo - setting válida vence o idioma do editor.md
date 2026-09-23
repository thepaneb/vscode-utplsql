---
id: BR-CONN-015
tipo: regra
titulo: Idioma efetivo - setting válida vence o idioma do editor
dominio: conexao
status: ativo
severidade: baixa
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/config.ts:80", "src/i18n.ts:117", "src/i18n.ts:144"]
testes: ["src/test/unit/i18n.test.ts"]
prds: ["PRD-49"]
tags: ["conexao", "i18n"]
---
## Enunciado

Se getExtensionLocale é chamada, então o idioma efetivo é resolvido começando pela setting utplsql.language: se ela é um locale do catálogo, vence; senão mapeia o idioma do VSCode (pt para pt-br, zh-hk/zh-tw para zh-tw, demais prefixos suportados) e cai em en por padrão.

## Pré-condições

Mensagens de runtime via t(locale, chave).

## Exceções

Setting auto cai no mapeamento do editor; en-gb só casa exato; chave ausente no catálogo alvo cai para pt-BR e depois para a própria chave.

## Justificativa

Localizar mensagens do domínio de conexão/configuração de forma consistente com a preferência do usuário.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-49-internacionalizacao|PRD-49]]
<!-- brain:auto:end -->
