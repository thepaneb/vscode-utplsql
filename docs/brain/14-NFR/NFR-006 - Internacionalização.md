---
id: NFR-006
tipo: nfr
titulo: "Internacionalização"
dominio: i18n
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[ADR-007 - i18n via package.nls com 23 locales]]", "[[MOC - I18n]]"]
tags: ["i18n"]
---
## Requisito

Mensagens de runtime localizadas (24 locales, base pt-BR) com fallback seguro; 23
variantes de README e `package.nls.*`; defasagem sinalizada.

## Justificativa

Alcance internacional da extensão.

## Verificação

`i18n.ts`, `i18nLocales.ts`, `docs:check`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 🔗 [[ADR-007 - i18n via package.nls com 23 locales]] · [[MOC - I18n]]
<!-- brain:auto:end -->
