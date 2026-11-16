import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Messages = Record<string, { message: string }>;

const LOCALES_DIR = new URL('../public/_locales/', import.meta.url);
const read = (locale: string): Messages =>
  JSON.parse(readFileSync(new URL(`${locale}/messages.json`, LOCALES_DIR), 'utf8'));

const locales = readdirSync(LOCALES_DIR);
const english = read('en');
const sources = ['../src/entrypoints/popup/index.html', '../src/popup/app.ts']
  .map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
  .join('\n');

describe('locales', () => {
  it('ships English, Russian and Georgian', () => {
    expect(locales.sort()).toEqual(['en', 'ka', 'ru']);
  });

  it.each(locales)('%s has exactly the English keys, all non-empty', (locale) => {
    const messages = read(locale);
    expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort());
    for (const { message } of Object.values(messages)) expect(message.trim()).not.toBe('');
  });

  it.each(locales)('%s keeps the $1 placeholders', (locale) => {
    const messages = read(locale);
    for (const [key, { message }] of Object.entries(english)) {
      expect(messages[key]?.message.includes('$1'), key).toBe(message.includes('$1'));
    }
  });

  it.each(locales)('%s respects the store limits for name and description', (locale) => {
    const { extName, extDescription } = read(locale);
    expect(extName?.message.length).toBeLessThanOrEqual(45);
    expect(extDescription?.message.length).toBeLessThanOrEqual(132);
  });

  it('defines every key the popup uses', () => {
    const used = [
      ...sources.matchAll(/data-i18n(?:-title|-label)?="(\w+)"/g),
      ...sources.matchAll(/\bt\('(\w+)'/g),
      ...sources.matchAll(/showError\('(\w+)'\)/g),
    ].map((match) => match[1]);
    expect(used.length).toBeGreaterThan(10);
    for (const key of used)
      expect(english, `missing message "${key}"`).toHaveProperty(key as string);
  });
});
