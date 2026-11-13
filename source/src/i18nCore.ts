import deCatalog from './locales/de.json';
import enCatalog from './locales/en.json';
import ruCatalog from './locales/ru.json';
import { translateRussianInline } from './russianInline';

export type AppLanguage = 'de' | 'en' | 'ru';
export type TranslationVariables = Record<string, string | number | boolean | null | undefined>;

export type TranslateFn = (deText: string, enText: string) => string;
export type CatalogTranslateFn = (key: string, variables?: TranslationVariables) => string;
type TranslationCatalog = Record<string, unknown>;

export type I18nContextValue = {
  language: AppLanguage;
  locale: string;
  tr: TranslateFn;
  t: CatalogTranslateFn;
};

const DEFAULT_LANGUAGE: AppLanguage = 'ru';
const catalogs: Record<AppLanguage, TranslationCatalog> = {
  de: deCatalog,
  en: enCatalog,
  ru: ruCatalog,
};

export const getLocale = (language: AppLanguage): string => {
  return language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'de-DE';
};

export const trByLanguage = (language: AppLanguage, deText: string, enText: string): string => {
  return language === 'ru' ? withRussianTranslation(enText, translateRussianInline(enText)) : language === 'en' ? enText : deText;
};

// Keep the English terminology visible so actions match Git/GitHub documentation.
// Unknown strings and unchanged technical names do not need a duplicate label.
const withRussianTranslation = (english: string, russian: string): string =>
  english === russian || !russian.trim() ? english : `${english} (${russian})`;

const lookupCatalogValue = (catalog: TranslationCatalog, key: string): string | null => {
  const parts = key
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
  let cursor: unknown = catalog;

  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) return null;
    cursor = (cursor as Record<string, unknown>)[part];
  }

  return typeof cursor === 'string' ? cursor : null;
};

const interpolate = (template: string, variables: TranslationVariables = {}): string => {
  return template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (match, name) => {
    const value = variables[name];
    return value === undefined || value === null ? match : String(value);
  });
};

export const translateFromCatalog = (language: AppLanguage, key: string, variables?: TranslationVariables): string => {
  const english = lookupCatalogValue(catalogs.en, key) ?? key;
  const value = lookupCatalogValue(catalogs[language], key) ?? english;
  // Interpolate each language before joining: user values (including braces and
  // dollar signs) remain literal, even when the translation reorders variables.
  return language === 'ru'
    ? withRussianTranslation(interpolate(english, variables), interpolate(value, variables))
    : interpolate(value, variables);
};

export const createLanguageTranslations = (language: AppLanguage): I18nContextValue => {
  return {
    language,
    locale: getLocale(language),
    tr: (deText, enText) => trByLanguage(language, deText, enText),
    t: (key, variables) => translateFromCatalog(language, key, variables),
  };
};

export const getDefaultI18nContextValue = (): I18nContextValue => ({
  language: DEFAULT_LANGUAGE,
  locale: getLocale(DEFAULT_LANGUAGE),
  tr: (deText, enText) => trByLanguage(DEFAULT_LANGUAGE, deText, enText),
  t: (key, variables) => translateFromCatalog(DEFAULT_LANGUAGE, key, variables),
});
