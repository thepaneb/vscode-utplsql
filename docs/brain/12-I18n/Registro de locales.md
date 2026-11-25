---
tipo: nota
status: ativo
modulo: i18n
data: 2026-11-25
verificado: 2026-11-25
tags: [i18n, locale, registro]
---

# Registro de locales

Fonte manual do estado de manutenção dos locales (PRD-91). As notas `LOC-*` são
**geradas** de `package.nls.*.json`; este registro é o complemento com
status/revisor/cobertura e é cobrado pelo `docs:fidelity` (uma entrada por
locale ativo).

Campos: `code` (obrigatório), `nome`, `status` (`ativo`/`beta`/`arquivado`),
`revisor` (pessoa/equipe responsável) e `cobertura` (superfícies mantidas).
A revisão in-country é registrada aqui e detalhada na
[[Política de locales]]; o fluxo de export/revisão entra na PRD-93.

```json
[
  { "code": "en", "nome": "English", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.md + package.nls.json + catálogo" },
  { "code": "pt-br", "nome": "Português (Brasil)", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.pt-BR.md + package.nls.pt-br.json + catálogo" },
  { "code": "en-gb", "nome": "English (UK)", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.en-GB.md + package.nls.en-gb.json + catálogo" },
  { "code": "es", "nome": "Español", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.es.md + package.nls.es.json + catálogo" },
  { "code": "zh-cn", "nome": "中文(简体)", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.zh-CN.md + package.nls.zh-cn.json + catálogo" },
  { "code": "zh-tw", "nome": "中文(繁體)", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.zh-TW.md + package.nls.zh-tw.json + catálogo" },
  { "code": "ja", "nome": "日本語", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.ja.md + package.nls.ja.json + catálogo" },
  { "code": "de", "nome": "Deutsch", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.de.md + package.nls.de.json + catálogo" },
  { "code": "fr", "nome": "Français", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.fr.md + package.nls.fr.json + catálogo" },
  { "code": "it", "nome": "Italiano", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.it.md + package.nls.it.json + catálogo" },
  { "code": "ko", "nome": "한국어", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.ko.md + package.nls.ko.json + catálogo" },
  { "code": "ru", "nome": "Русский", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.ru.md + package.nls.ru.json + catálogo" },
  { "code": "tr", "nome": "Türkçe", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.tr.md + package.nls.tr.json + catálogo" },
  { "code": "pl", "nome": "Polski", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.pl.md + package.nls.pl.json + catálogo" },
  { "code": "cs", "nome": "Čeština", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.cs.md + package.nls.cs.json + catálogo" },
  { "code": "hu", "nome": "Magyar", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.hu.md + package.nls.hu.json + catálogo" },
  { "code": "bg", "nome": "Български", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.bg.md + package.nls.bg.json + catálogo" },
  { "code": "el", "nome": "Ελληνικά", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.el.md + package.nls.el.json + catálogo" },
  { "code": "id", "nome": "Bahasa Indonesia", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.id.md + package.nls.id.json + catálogo" },
  { "code": "ro", "nome": "Română", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.ro.md + package.nls.ro.json + catálogo" },
  { "code": "sr", "nome": "Српски", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.sr.md + package.nls.sr.json + catálogo" },
  { "code": "th", "nome": "ไทย", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.th.md + package.nls.th.json + catálogo" },
  { "code": "uk", "nome": "Українська", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.uk.md + package.nls.uk.json + catálogo" },
  { "code": "vi", "nome": "Tiếng Việt", "status": "ativo", "revisor": "Gil Cleber Barboza", "cobertura": "README.vi.md + package.nls.vi.json + catálogo" },
  { "code": "ar", "nome": "العربية", "status": "beta", "revisor": "pendente", "cobertura": "README.ar.md + package.nls.ar.json + catálogo" },
  { "code": "he", "nome": "עברית", "status": "beta", "revisor": "pendente", "cobertura": "README.he.md + package.nls.he.json + catálogo" }
]
```

## Conexões

- 🗺️ [[MOC - I18n]]
- 📄 [[prd-91-doc-parity-localized-distribution|PRD-91]]
- 📋 [[Política de locales]]
