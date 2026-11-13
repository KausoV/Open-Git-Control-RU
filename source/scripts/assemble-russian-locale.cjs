const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const translation = path.resolve(root, '../translation');
const load = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const dictionary = {};
const placeholders = text => (text.match(/\{\{\d+\}\}|\{[a-zA-Z0-9_.-]+\}/g) || []).sort();
for (const name of ['part-0', 'part-1', 'part-2', 'extra']) {
  const english = load(path.join(translation, `${name}-en.json`));
  const russian = load(path.join(translation, `${name}-ru.json`));
  if (Object.keys(english).length !== Object.keys(russian).length) throw new Error(`Incomplete ${name}`);
  for (const key of Object.keys(english)) {
    const value = russian[key];
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing translation: ${key}`);
    if (JSON.stringify(placeholders(key)) !== JSON.stringify(placeholders(value))) throw new Error(`Placeholders changed: ${key}`);
    dictionary[key] = value;
  }
}
for (const name of ['review-overrides.json', 'root-overrides.json']) {
  const file = path.join(translation, name);
  if (fs.existsSync(file)) Object.assign(dictionary, load(file));
}
for (const [key, value] of Object.entries(dictionary)) {
  if (JSON.stringify(placeholders(key)) !== JSON.stringify(placeholders(value))) throw new Error(`Override placeholders changed: ${key}`);
}
const catalog = load(path.join(root, 'src/locales/en.json'));
let catalogCount = 0;
function translate(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => {
    if (typeof value !== 'string') return [key, translate(value)];
    if (!dictionary[value]) throw new Error(`Missing catalog translation: ${key}`);
    catalogCount++;
    return [key, dictionary[value]];
  }));
}
fs.writeFileSync(path.join(root, 'src/locales/ru.json'), JSON.stringify(translate(catalog), null, 2) + '\n');
fs.writeFileSync(path.join(root, 'src/locales/ru-phrases.json'), JSON.stringify(dictionary, null, 2) + '\n');
console.log(JSON.stringify({catalogKeys:catalogCount,translatedPhrases:Object.keys(dictionary).length}));
