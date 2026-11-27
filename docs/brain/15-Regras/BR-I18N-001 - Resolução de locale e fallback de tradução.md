---
id: BR-I18N-001
aliases: [BR-I18N-001]
tipo: regra
titulo: Resolução de locale e fallback de tradução
dominio: i18n
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/i18n.ts:42", "src/i18n.ts:44", "src/i18n.ts:45", "src/i18n.ts:66", "src/i18n.ts:78", "src/i18n.ts:84", "src/i18n.ts:36"]
testes: ["src/test/unit/i18n.test.ts"]
prds: ["PRD-49"]
requisitos: ["PRD-49/RF2"]
tags: ["i18n"]
---
## Enunciado

resolveLocale escolhe a setting informada se for um locale conhecido; senão deriva do idioma do VSCode (pt* para pt-br, zh-tw/zh-hk para zh-tw, zh* para zh-cn, demais prefixos suportados, en-gb literal) e cai em en; t busca a chave no catálogo do locale, depois em pt-BR e, se ainda ausente, retorna a própria chave, preservando placeholders desconhecidos e nunca lançando.

## Pré-condições

Catálogos definidos em `src/i18n/locales/*` (um arquivo por locale, 24), exportados
pelo barrel com `LOCALE_CODES`, com pt-BR como base.

## Exceções

Setting inválida (ex.: xx) é ignorada e cai no auto; zh-HK mapeia para zh-tw.

## Justificativa

Permite forçar idioma independente do editor e garante que nenhuma mensagem fique vazia ou quebre.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-49-internacionalizacao|PRD-49]]
- 🎯 Requisitos: [[prd-49-internacionalizacao|PRD-49 RF2]]
- 🧩 Código: [[COD - i18n.ts]]
- 🧪 Testes: [[TST - i18n.test.ts]]
- ↩️ Referenciada por: [[09-configuration]] · [[ADR-007 - i18n via package.nls com 23 locales|ADR-007]] · [[ADR-014 - Catálogo próprio com plurais CLDR|ADR-014]] · [[Configuration]] · [[Internationalization]] · [[NFR-006 - Internacionalização|NFR-006]] · [[prd-49-internacionalizacao|PRD-49]]
<!-- brain:auto:end -->
