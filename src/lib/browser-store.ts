import { browser } from 'wxt/browser';
import type { KeyValueStore } from './types';

/** `browser.storage.local` behind the storage interface the rest of the code uses. */
export const browserStore: KeyValueStore = {
  async get<T>(key: string) {
    return (await browser.storage.local.get(key))[key] as T | undefined;
  },
  async set(key, value) {
    await browser.storage.local.set({ [key]: value });
  },
};
