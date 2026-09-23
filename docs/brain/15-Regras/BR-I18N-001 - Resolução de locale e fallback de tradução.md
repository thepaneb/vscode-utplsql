---
id: BR-I18N-001
tipo: regra
titulo: Resolução de locale e fallback de tradução
dominio: i18n
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/i18n.ts:117", "src/i18n.ts:120", "src/i18n.ts:121", "src/i18n.ts:142", "src/i18n.ts:154", "src/i18n.ts:160", "src/i18n.ts:112"]
testes: ["src/test/unit/i18n.test.ts"]
prds: ["PRD-49"]
requisitos: ["PRD-49/RF2"]
tags: ["i18n"]
---
## Enunciado

resolveLocale escolhe a setting informada se for um locale conhecido; senão deriva do idioma do VSCode (pt* para pt-br, zh-tw/zh-hk para zh-tw, zh* para zh-cn, demais prefixos suportados, en-gb literal) e cai em en; t busca a chave no catálogo do locale, depois em pt-BR e, se ainda ausente, retorna a própria chave, preservando placeholders desconhecidos e nunca lançando.

## Pré-condições

Catálogos definidos em i18nLocales (24 locales), com pt-BR como base.

## Exceções

Setting inválida (ex.: xx) é ignorada e cai no auto; zh-HK mapeia para zh-tw.

## Justificativa

Permite forçar idioma independente do editor e garante que nenhuma mensagem fique vazia ou quebre.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-49-internacionalizacao|PRD-49]]
- 🎯 Requisitos: [[prd-49-internacionalizacao|PRD-49 RF2]]
<!-- brain:auto:end -->
