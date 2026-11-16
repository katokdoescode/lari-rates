import type { KeyValueStore } from './types';

export const SETTINGS_KEY = 'settings';

export interface Settings {
  /** Last selected currency code. */
  currency: string;
  /** Last amount typed into the converter. */
  amount: string;
}

export const DEFAULT_SETTINGS: Settings = { currency: 'USD', amount: '100' };

export async function loadSettings(store: KeyValueStore): Promise<Settings> {
  const saved = await store.get<Partial<Settings>>(SETTINGS_KEY).catch(() => undefined);
  return {
    currency:
      typeof saved?.currency === 'string' && /^[A-Z]{3}$/.test(saved.currency)
        ? saved.currency
        : DEFAULT_SETTINGS.currency,
    amount: typeof saved?.amount === 'string' ? saved.amount : DEFAULT_SETTINGS.amount,
  };
}

export async function saveSettings(store: KeyValueStore, settings: Settings): Promise<void> {
  await store.set(SETTINGS_KEY, settings).catch(() => undefined);
}
