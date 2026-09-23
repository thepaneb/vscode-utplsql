<!-- GENERATED FROM docs/brain/70-Wiki/Internationalization.md — DO NOT EDIT -->

# Internationalization (i18n)

The extension's runtime messages (prompts, output, diagnostics and quick-fixes)
follow your VSCode display language, and can be pinned with the
`utplsql.language` setting.

> Introduced in PRD-49.

## Setting

| Setting | Values | Default |
|---|---|---|
| `utplsql.language` | `auto` \| `pt-br` \| `en` \| `en-gb` \| `es` \| `zh-cn` \| `zh-tw` \| `ja` \| `de` \| `fr` \| `it` \| `ko` \| `ru` \| `tr` \| `pl` \| `cs` \| `hu` \| `bg` \| `el` \| `id` \| `ro` \| `sr` \| `th` \| `uk` \| `vi` | `auto` |

`auto` follows the VSCode locale: `pt` → `pt-br`, `zh-tw`/`zh-hk` → `zh-tw`, and
so on; anything unsupported falls back to `en`. A fixed value always wins.

## How it is split

| Layer | Source |
|---|---|
| Command / setting titles | `package.nls.json` + `package.nls.<locale>.json` (contributed by VSCode) |
| Runtime messages | `src/i18n.ts` (engine) + `src/i18nLocales.ts` (catalogues) |

```typescript
function resolveLocale(setting: string, vscodeLanguage: string): ExtensionLocale;
function t(locale: ExtensionLocale, key: string, params?): string;
```

- `t` interpolates `{param}` placeholders: `t(locale, 'key', { param: value })`.
- A missing key falls back to **pt-BR**, then to the key itself. It never throws.

![Internationalization architecture](images/diagram-i18n.png)

## Notes

- The catalogues cover the **24 locales** listed above (+ `auto`), so the setting
  has 25 valid values.
- Diagnostics from Oracle (e.g. `ORA-`, `DPI-`) are not translated — only the
  extension's own wrapper messages are.
