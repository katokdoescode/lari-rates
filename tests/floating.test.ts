import { describe, expect, it, vi } from 'vitest';
import { FLOATING_KEY, isFloating, openFloatingWindow, type WindowsApi } from '../src/lib/floating';
import { memoryStore } from './helpers';

const URL = 'chrome-extension://abc/popup.html';

function fakeWindows(overrides: Partial<WindowsApi> = {}) {
  return {
    create: vi.fn<WindowsApi['create']>(async () => ({ id: 7 })),
    update: vi.fn<WindowsApi['update']>(async () => undefined),
    ...overrides,
  };
}

describe('isFloating', () => {
  it('detects the floating parameter', () => {
    expect(isFloating('?floating=1')).toBe(true);
    expect(isFloating('?a=b&floating')).toBe(true);
    expect(isFloating('')).toBe(false);
    expect(isFloating('?mode=popup')).toBe(false);
  });
});

describe('openFloatingWindow', () => {
  it('opens a popup-type window and remembers its id', async () => {
    const windows = fakeWindows();
    const store = memoryStore();
    await openFloatingWindow({ windows, store, url: URL });

    expect(windows.create).toHaveBeenCalledExactlyOnceWith({
      url: `${URL}?floating=1`,
      type: 'popup',
      width: 360,
      height: 540,
    });
    expect(await store.get(FLOATING_KEY)).toBe(7);
  });

  it('focuses the existing window instead of opening a second one', async () => {
    const windows = fakeWindows();
    await openFloatingWindow({ windows, store: memoryStore({ [FLOATING_KEY]: 7 }), url: URL });

    expect(windows.update).toHaveBeenCalledExactlyOnceWith(7, { focused: true });
    expect(windows.create).not.toHaveBeenCalled();
  });

  it('opens a new window when the remembered one was closed', async () => {
    const windows = fakeWindows({
      create: vi.fn<WindowsApi['create']>(async () => ({ id: 9 })),
      update: vi.fn<WindowsApi['update']>(async () => {
        throw new Error('No window with id: 7');
      }),
    });
    const store = memoryStore({ [FLOATING_KEY]: 7 });
    await openFloatingWindow({ windows, store, url: URL });

    expect(windows.create).toHaveBeenCalledTimes(1);
    expect(await store.get(FLOATING_KEY)).toBe(9);
  });

  it('works without usable storage', async () => {
    const windows = fakeWindows();
    const broken = {
      get: async () => {
        throw new Error('nope');
      },
      set: async () => {
        throw new Error('nope');
      },
    };
    await expect(openFloatingWindow({ windows, store: broken, url: URL })).resolves.toBeUndefined();
    expect(windows.create).toHaveBeenCalledTimes(1);
  });

  it('reports a failure to open the window', async () => {
    const windows = fakeWindows({
      create: vi.fn<WindowsApi['create']>(async () => {
        throw new Error('blocked');
      }),
    });
    await expect(openFloatingWindow({ windows, store: memoryStore(), url: URL })).rejects.toThrow(
      'blocked',
    );
  });
});
