import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import phrases from '../locales/ru-phrases.json';
import { createLanguageTranslations, getDefaultI18nContextValue } from '../i18nCore';
import { translateRussianInline } from '../russianInline';

function leaves(value: Record<string, unknown>, prefix = ''): Record<string,string> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => typeof item === 'string'
    ? [[prefix+key,item]] : Object.entries(leaves(item as Record<string,unknown>,prefix+key+'.'))));
}
const placeholders = (text: string) => (text.match(/\{\{\d+\}\}|\{[a-zA-Z0-9_.-]+\}/g) || []).sort();

describe('English originals with Russian translations', () => {
  it('covers every catalog key and preserves all interpolation variables', () => {
    const english=leaves(en),russian=leaves(ru);
    expect(Object.keys(russian).sort()).toEqual(Object.keys(english).sort());
    for(const [key,value] of Object.entries(english)) {
      expect(russian[key].trim(),key).not.toBe('');
      expect(placeholders(russian[key]),key).toEqual(placeholders(value));
    }
    for(const [key,value] of Object.entries(phrases))expect(placeholders(value),key).toEqual(placeholders(key));
  });
  it('shows English first with Russian in parentheses by default and keeps English/German selectable', () => {
    const russian=createLanguageTranslations('ru');
    expect(russian.locale).toBe('ru-RU');
    expect(russian.t('sidebar.settings')).toBe('Settings (Настройки)');
    expect(russian.tr('Abbrechen','Cancel')).toBe('Cancel (Отмена)');
    expect(getDefaultI18nContextValue().t('sidebar.settings')).toBe('Settings (Настройки)');
    expect(russian.tr('GitHub', 'GitHub')).toBe('GitHub');
    expect(russian.tr('unbekannt', 'unknown UI text')).toBe('unknown UI text');
    expect(russian.t('missing.translation.key')).toBe('missing.translation.key');
    expect(getDefaultI18nContextValue().language).toBe('ru');
    expect(createLanguageTranslations('en').tr('Abbrechen','Cancel')).toBe('Cancel');
    expect(createLanguageTranslations('de').tr('Abbrechen','Cancel')).toBe('Abbrechen');
  });
  it('keeps filenames and substitution syntax verbatim inside a translated template', () => {
    const value='C:\\Проект\\$& {{0}} [тест].txt';
    expect(translateRussianInline(`Could not copy ${value}.`)).toBe(`Не удалось скопировать «${value}».`);
    expect(translateRussianInline(value)).toBe(value);
    expect(translateRussianInline('__proto__')).toBe('__proto__');
  });
  it('does not append English plural suffixes and translates only known grammar slots', () => {
    expect(translateRussianInline('2 files')).toBe('Файлов: 2');
    expect(translateRussianInline('1 file')).toBe('Файлов: 1');
    expect(translateRussianInline('2 changes selected')).toBe('Выбрано изменений: 2');
    expect(translateRussianInline('Local is ahead by 3 commits')).toBe('Локальная история впереди. Коммитов: 3');
    expect(translateRussianInline('Local is ahead by text commitname')).toBe('Local is ahead by text commitname');
  });
  it('interpolates catalog values without losing dollar characters or translating user data', () => {
    const version = '$& {version} (тест)';
    const translated = createLanguageTranslations('ru').t('updates.dialogMessage',{version});
    expect(translated).toBe(`${en.updates.dialogMessage.replace('{version}', () => version)} (${ru.updates.dialogMessage.replace('{version}', () => version)})`);
    const filename = 'C:\\Проект\\$& {{0}} [тест].txt';
    expect(createLanguageTranslations('ru').tr('',`Could not copy ${filename}.`))
      .toBe(`Could not copy ${filename}. (Не удалось скопировать «${filename}».)`);
  });
});
