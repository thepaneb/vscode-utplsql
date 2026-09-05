// Motor i18n da extensão. PURO (sem 'vscode') — testável com node --test.
// Catálogos em i18nLocales.ts. Chave ausente → pt-BR → a própria chave.

import { de, en, es, fr, ja, ptBr, zhCn } from './i18nLocales';

export type ExtensionLocale = 'pt-br' | 'en' | 'es' | 'zh-cn' | 'ja' | 'de' | 'fr';

export { de, en, es, fr, ja, ptBr, zhCn } from './i18nLocales';

const catalogs: Record<ExtensionLocale, Record<string, string>> = {
  'pt-br': ptBr,
  en,
  es,
  'zh-cn': zhCn,
  ja,
  de,
  fr,
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
  if (lang.startsWith('zh')) return 'zh-cn';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('fr')) return 'fr';
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
