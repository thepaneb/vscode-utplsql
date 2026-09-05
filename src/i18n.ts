// Motor i18n da extensão. PURO (sem 'vscode') — testável com node --test.
// Catálogos em i18nLocales.ts. Chave ausente → pt-BR → a própria chave.

import { cs, de, en, es, fr, hu, it, ja, ko, pl, ptBr, ru, tr, zhCn, zhTw } from './i18nLocales';

export type ExtensionLocale =
  | 'pt-br'
  | 'en'
  | 'es'
  | 'zh-cn'
  | 'zh-tw'
  | 'ja'
  | 'de'
  | 'fr'
  | 'it'
  | 'ko'
  | 'ru'
  | 'tr'
  | 'pl'
  | 'cs'
  | 'hu';

export { cs, de, en, es, fr, hu, it, ja, ko, pl, ptBr, ru, tr, zhCn, zhTw } from './i18nLocales';

const catalogs: Record<ExtensionLocale, Record<string, string>> = {
  'pt-br': ptBr,
  en,
  es,
  'zh-cn': zhCn,
  'zh-tw': zhTw,
  ja,
  de,
  fr,
  it,
  ko,
  ru,
  tr,
  pl,
  cs,
  hu,
};

/** Chaves do catálogo base (pt-BR) ausentes em um catálogo alvo. */
export function missingCatalogKeys(catalog: Record<string, string>): string[] {
  return Object.keys(ptBr).filter((k) => !(k in catalog));
}

/** Resolve o idioma efetivo a partir da setting e do idioma do VSCode. */
export function resolveLocale(setting: string, vscodeLanguage: string): ExtensionLocale {
  if (setting in catalogs) return setting as ExtensionLocale;
  const lang = vscodeLanguage.toLowerCase();
  if (lang.startsWith('pt')) return 'pt-br';
  if (lang === 'zh-tw' || lang === 'zh-hk') return 'zh-tw';
  if (lang.startsWith('zh')) return 'zh-cn';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('it')) return 'it';
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('ru')) return 'ru';
  if (lang.startsWith('tr')) return 'tr';
  if (lang.startsWith('pl')) return 'pl';
  if (lang.startsWith('cs')) return 'cs';
  if (lang.startsWith('hu')) return 'hu';
  return 'en';
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k: string) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

/** Traduz uma chave; chave ausente → pt-BR → a própria chave. Nunca lança. */
export function t(
  locale: ExtensionLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const catalog = catalogs[locale];
  const template = catalog[key] ?? ptBr[key] ?? key;
  return interpolate(template, params);
}
