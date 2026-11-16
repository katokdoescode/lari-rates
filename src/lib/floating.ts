import type { KeyValueStore } from './types';

export const FLOATING_KEY = 'floatingWindowId';
/** Query parameter that tells the popup page it runs in its own window. */
export const FLOATING_PARAM = 'floating';

/** The part of `browser.windows` the floating window needs. */
export interface WindowsApi {
  create(options: {
    url: string;
    type: 'popup';
    width: number;
    height: number;
  }): Promise<{ id?: number } | undefined>;
  update(id: number, options: { focused: true }): Promise<unknown>;
}

export interface FloatingWindowOptions {
  windows: WindowsApi;
  store: KeyValueStore;
  /** URL of the popup page, without the floating parameter. */
  url: string;
  width?: number;
  height?: number;
}

export function isFloating(search: string): boolean {
  return new URLSearchParams(search).has(FLOATING_PARAM);
}

/**
 * Open the popup page in a standalone window that survives tab switches.
 * If such a window is already open it is focused instead of opening a second one.
 */
export async function openFloatingWindow({
  windows,
  store,
  url,
  width = 360,
  height = 540,
}: FloatingWindowOptions): Promise<void> {
  const existing = await store.get<number>(FLOATING_KEY).catch(() => undefined);
  if (typeof existing === 'number') {
    try {
      await windows.update(existing, { focused: true });
      return;
    } catch {
      // The window was closed; open a new one.
    }
  }
  const created = await windows.create({
    url: `${url}?${FLOATING_PARAM}=1`,
    type: 'popup',
    width,
    height,
  });
  if (typeof created?.id === 'number') {
    await store.set(FLOATING_KEY, created.id).catch(() => undefined);
  }
}
