// Motor i18n da extensão. PURO (sem 'vscode') — testável com node --test.
// Catálogos em i18n/locales (um arquivo por locale, barrel com LOCALE_CODES).
// Chave ausente → pt-BR → a própria chave.

import {
  type Catalog,
  catalogs,
  LOCALE_CODES,
  type ExtensionLocale as LocaleCode,
  type Message,
} from './i18n/locales';

/** Locale pseudo de desenvolvimento (`UTPLSQL_PSEUDO_LOC=1`), fora da setting pública. */
export const PSEUDO_LOCALE = 'qps-ploc' as const;

export type ExtensionLocale = LocaleCode | typeof PSEUDO_LOCALE;
export {
  bg,
  cs,
  de,
  el,
  en,
  enGb,
  es,
  fr,
  hu,
  id,
  it,
  ja,
  ko,
  pl,
  ptBr,
  ro,
  ru,
  sr,
  th,
  tr,
  uk,
  vi,
  zhCn,
  zhTw,
} from './i18n/locales';

/** Chaves do catálogo base (pt-BR) ausentes em um catálogo alvo. */
export function missingCatalogKeys(catalog: Catalog): string[] {
  return Object.keys(catalogs['pt-br']).filter((k) => !(k in catalog));
}

/** Pseudo-locale ligado apenas por env de desenvolvimento (nunca em produção). */
function isPseudoEnabled(): boolean {
  return process.env.UTPLSQL_PSEUDO_LOC === '1';
}

const PSEUDO_ACCENTS = {
  a: 'á',
  e: 'é',
  i: 'í',
  o: 'ó',
  u: 'ú',
  n: 'ñ',
  c: 'ç',
  A: 'Á',
  E: 'É',
  I: 'Í',
  O: 'Ó',
  U: 'Ú',
  N: 'Ñ',
  C: 'Ç',
} as const;

/**
 * Transforma o texto para pseudo-localização: acentua vogais/consoantes
 * estáveis e acrescenta padding (~30%) entre marcadores. Determinístico.
 */
export function pseudoLocalize(text: string): string {
  const accented = text.replace(
    /[aeiouncAEIOUNC]/g,
    (ch) => PSEUDO_ACCENTS[ch as keyof typeof PSEUDO_ACCENTS],
  );
  return `[${accented}${'~'.repeat(Math.ceil(text.length * 0.3))}]`;
}

/** Resolve o idioma efetivo a partir da setting e do idioma do VSCode. */
export function resolveLocale(setting: string, vscodeLanguage: string): ExtensionLocale {
  if (setting === PSEUDO_LOCALE && isPseudoEnabled()) return PSEUDO_LOCALE;
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
  if (lang.startsWith('bg')) return 'bg';
  if (lang.startsWith('el')) return 'el';
  if (lang.startsWith('id')) return 'id';
  if (lang.startsWith('ro')) return 'ro';
  if (lang.startsWith('sr')) return 'sr';
  if (lang.startsWith('th')) return 'th';
  if (lang.startsWith('uk')) return 'uk';
  if (lang.startsWith('vi')) return 'vi';
  if (lang === 'en-gb') return 'en-gb';
  return 'en';
}

/** Formata número para exibição; fallback en → String. Nunca lança. */
export function formatNumber(
  locale: ExtensionLocale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  const safeLocale: ExtensionLocale = (LOCALE_CODES as readonly string[]).includes(locale)
    ? locale
    : 'en';
  try {
    return new Intl.NumberFormat(safeLocale, options).format(value);
  } catch {
    // Opções inválidas (`Intl` lança): devolve o número cru, sem quebrar a UI.
    return String(value);
  }
}

/** Duração legível: `850 ms` abaixo de 1 s; `12,3 s` acima. */
export function formatDuration(locale: ExtensionLocale, ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${formatNumber(locale, ms / 1000, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} s`;
}

/** Parâmetros numéricos que representam contagens (recebem grouping do locale). */
const LOCALIZED_NUMERIC_PARAMS = new Set(['count', 'total', 'current']);

function interpolate(
  template: string,
  locale: ExtensionLocale,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k: string) => {
    if (!(k in params)) return `{${k}}`;
    const value = params[k];
    if (typeof value === 'number' && LOCALIZED_NUMERIC_PARAMS.has(k)) {
      return formatNumber(locale, value);
    }
    return String(value);
  });
}

function catalogFor(locale: ExtensionLocale): Catalog {
  return locale === PSEUDO_LOCALE ? catalogs.en : catalogs[locale];
}

function resolveMessage(locale: ExtensionLocale, key: string): Message {
  const catalog = catalogFor(locale);
  return catalog[key] ?? catalogs['pt-br'][key] ?? key;
}

/** Seleciona a forma plural via CLDR; fallback other → pt-BR → chave. */
function selectForm(
  locale: ExtensionLocale,
  key: string,
  message: Message,
  params?: Record<string, string | number>,
): string {
  if (typeof message === 'string') return message;
  const count = typeof params?.count === 'number' ? params.count : undefined;
  if (count === undefined) return message.other ?? message.one ?? key;
  const rules = new Intl.PluralRules(locale === PSEUDO_LOCALE ? 'en' : locale);
  const category = rules.select(count);
  if (message[category] !== undefined) return message[category] as string;
  if (message.other !== undefined) return message.other;
  const base = catalogs['pt-br'][key];
  if (typeof base === 'object') return base[category] ?? base.other ?? base.one ?? key;
  return typeof base === 'string' ? base : key;
}

/** Traduz uma chave; chave ausente → pt-BR → a própria chave. Nunca lança. */
export function t(
  locale: ExtensionLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const template = selectForm(locale, key, resolveMessage(locale, key), params);
  const text = interpolate(template, locale, params);
  return isPseudoEnabled() ? pseudoLocalize(text) : text;
}
