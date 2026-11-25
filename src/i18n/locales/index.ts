// Catálogos i18n da extensão. PURO (sem 'vscode').
// pt-BR é o base; os demais traduzem. Chave ausente → pt-BR → a própria chave.
// Um arquivo por locale (PRD-115); a ordem de LOCALE_CODES é canônica.

import { ar } from './ar';
import { bg } from './bg';
import { cs } from './cs';
import { de } from './de';
import { el } from './el';
import { en } from './en';
import { enGb } from './en-gb';
import { es } from './es';
import { fr } from './fr';
import { he } from './he';
import { hu } from './hu';
import { id } from './id';
import { it } from './it';
import { ja } from './ja';
import { ko } from './ko';
import { pl } from './pl';
import { ptBr } from './pt-br';
import { ro } from './ro';
import { ru } from './ru';
import { sr } from './sr';
import { th } from './th';
import { tr } from './tr';
import type { Catalog } from './types';
import { uk } from './uk';
import { vi } from './vi';
import { zhCn } from './zh-cn';
import { zhTw } from './zh-tw';

export const LOCALE_CODES = [
  'pt-br',
  'en',
  'en-gb',
  'es',
  'zh-cn',
  'zh-tw',
  'ja',
  'de',
  'fr',
  'it',
  'ko',
  'ru',
  'tr',
  'pl',
  'cs',
  'hu',
  'bg',
  'el',
  'id',
  'ro',
  'sr',
  'th',
  'uk',
  'vi',
  'ar',
  'he',
] as const;

export type ExtensionLocale = (typeof LOCALE_CODES)[number];
export type { Catalog, Message, PluralForms } from './types';

export const catalogs: Record<ExtensionLocale, Catalog> = {
  'pt-br': ptBr,
  en: en,
  'en-gb': enGb,
  es: es,
  'zh-cn': zhCn,
  'zh-tw': zhTw,
  ja: ja,
  de: de,
  fr: fr,
  it: it,
  ko: ko,
  ru: ru,
  tr: tr,
  pl: pl,
  cs: cs,
  hu: hu,
  bg: bg,
  el: el,
  id: id,
  ro: ro,
  sr: sr,
  th: th,
  uk: uk,
  vi: vi,
  ar: ar,
  he: he,
};

export {
  ar,
  bg,
  cs,
  de,
  el,
  en,
  enGb,
  es,
  fr,
  he,
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
};
