/** Formas plurais CLDR de uma mensagem (PRD-90). */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>;

/** Valor de catálogo: string simples ou formas plurais. */
export type Message = string | PluralForms;

/** Catálogo de um locale. */
export type Catalog = Record<string, Message>;
