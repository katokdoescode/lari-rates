import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { browserStore } from '../src/lib/browser-store';
import { DEFAULT_SETTINGS, loadSettings, SETTINGS_KEY, saveSettings } from '../src/lib/settings';
import { memoryStore } from './helpers';

describe('settings', () => {
  it('returns defaults when nothing is saved', async () => {
    expect(await loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved values', async () => {
    const store = memoryStore();
    await saveSettings(store, { currency: 'EUR', amount: '250,5' });
    expect(await loadSettings(store)).toEqual({ currency: 'EUR', amount: '250,5' });
  });

  it.each([
    ['a lowercase code', { currency: 'eur', amount: '1' }, { currency: 'USD', amount: '1' }],
    ['a non-string code', { currency: 42 }, DEFAULT_SETTINGS],
    ['a non-string amount', { currency: 'GBP', amount: 5 }, { currency: 'GBP', amount: '100' }],
    ['a non-object', 'garbage', DEFAULT_SETTINGS],
  ])('repairs %s', async (_label, saved, expected) => {
    expect(await loadSettings(memoryStore({ [SETTINGS_KEY]: saved }))).toEqual(expected);
  });

  it('survives a failing store', async () => {
    const broken = {
      get: async () => {
        throw new Error('nope');
      },
      set: async () => {
        throw new Error('nope');
      },
    };
    expect(await loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    await expect(saveSettings(broken, DEFAULT_SETTINGS)).resolves.toBeUndefined();
  });
});

describe('browserStore', () => {
  beforeEach(() => fakeBrowser.reset());

  it('reads and writes browser.storage.local', async () => {
    expect(await browserStore.get('missing')).toBeUndefined();
    await browserStore.set('answer', { value: 42 });
    expect(await browserStore.get('answer')).toEqual({ value: 42 });
    expect(await fakeBrowser.storage.local.get('answer')).toEqual({ answer: { value: 42 } });
  });
});
