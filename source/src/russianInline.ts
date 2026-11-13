import phrases from './locales/ru-phrases.json';
import pluralSlots from './locales/ru-template-metadata.json';

const plurals: Record<string, number[]> = pluralSlots;
const enumSlots: Record<string, Record<string, Record<string, string>>> = {
  '{{0}} {{1}} cannot be preserved. New commits follow your Git signing configuration.': { '1': { signature: 'подписей', signatures: 'подписей' } },
  'Select change for {{0}}: {{1}} line {{2}}': { '0': { staging: 'добавления в индекс', unstaging: 'удаления из индекса' }, '1': { old: 'старая', new: 'новая' } },
  '{{0}} {{1}} selected': { '1': { change: 'изменений', changes: 'изменений' } },
  '{{0}} on GitHub. Upload {{1}} before creating the release?': { '1': { it: 'это', them: 'их' } },
  '{{0}}: {{1}}.{{2}} A new draft is ready.': { '0': { 'Release draft saved': 'Черновик релиза сохранён', 'Release published': 'Релиз опубликован' } },
  'Git LFS recommended: large {{0}} file ({{1}}). Convert through the context menu.': { '0': { 'media/asset': 'медиафайл или ресурс', binary: 'двоичный файл' } },
};

const dictionary: Readonly<Record<string, string>> = phrases;
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Upstream still has bilingual tr(de,en) calls with interpolated values. Match
// only complete known UI templates; captured repository/user text is kept verbatim.
const templates = Object.entries(dictionary)
  .filter(([source]) => /\{\{\d+\}\}/.test(source))
  .sort(([a], [b]) => b.replace(/\{\{\d+\}\}/g, '').length - a.replace(/\{\{\d+\}\}/g, '').length)
  .map(([source, target]) => {
    const slots: string[] = [];
    let offset = 0, pattern = '^';
    for (const match of source.matchAll(/\{\{(\d+)\}\}/g)) {
      pattern += escapeRegex(source.slice(offset, match.index)) + '([\\s\\S]*?)';
      slots.push(match[1]);
      offset = match.index! + match[0].length;
    }
    const literals = source.split(/\{\{\d+\}\}/);
    return { source, prefix: literals[0], suffix: literals.at(-1)!, regex: new RegExp(pattern + escapeRegex(source.slice(offset)) + '$'), slots, target };
  });

export function translateRussianInline(english: string): string {
  if (Object.prototype.hasOwnProperty.call(dictionary, english)) return dictionary[english];
  if (english.length > 20000) return english;
  for (const template of templates) {
    if (!english.startsWith(template.prefix) || !english.endsWith(template.suffix)) continue;
    const match = template.regex.exec(english);
    if (!match) continue;
    const values = Object.fromEntries(template.slots.map((slot, i) => [slot, match[i + 1]]));
    const suffixes = plurals[template.source] || [];
    if (suffixes.some(slot => !['', 's', 'es'].includes(values[slot]))) continue;
    for (const slot of suffixes) values[slot] = '';
    const enums = enumSlots[template.source] || {};
    if (Object.entries(enums).some(([slot, options]) => !Object.prototype.hasOwnProperty.call(options, values[slot]))) continue;
    for (const [slot, options] of Object.entries(enums)) values[slot] = options[values[slot]];
    return template.target.replace(/\{\{(\d+)\}\}/g, (marker, slot: string) => values[slot] ?? marker);
  }
  return english;
}
