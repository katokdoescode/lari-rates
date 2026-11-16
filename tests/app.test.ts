// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import english from '../public/_locales/en/messages.json';
import { SETTINGS_KEY } from '../src/lib/settings';
import type { RatesSnapshot } from '../src/lib/types';
import { type AppDeps, mountApp } from '../src/popup/app';
import { AMD, EUR, memoryStore, snapshotOf, USD } from './helpers';

const TODAY = '2026-10-22';
const MARKUP = readFileSync(
  resolve(import.meta.dirname, '../src/entrypoints/popup/index.html'),
  'utf8',
).replace(/<script[\s\S]*?<\/script>/g, '');

const t: AppDeps['t'] = (key, substitution) =>
  (english as Record<string, { message: string }>)[key]?.message.replace(
    '$1',
    substitution ?? '',
  ) ?? key;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const text = (id: string) => $(id).textContent?.trim() ?? '';
const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

function type(id: string, value: string) {
  $<HTMLInputElement>(id).value = value;
  $(id).dispatchEvent(new Event('input', { bubbles: true }));
}

function change(id: string, value: string) {
  $<HTMLInputElement | HTMLSelectElement>(id).value = value;
  $(id).dispatchEvent(new Event('change', { bubbles: true }));
}

async function click(id: string) {
  $(id).click();
  await flush();
}

async function mount(overrides: Partial<AppDeps> = {}) {
  const loadRates = vi.fn(async (date: string): Promise<RatesSnapshot | null> => snapshotOf(date));
  const copy = vi.fn(async (_text: string) => {});
  const store = overrides.store ?? memoryStore();
  await mountApp(document, {
    loadRates,
    copy,
    t,
    today: () => TODAY,
    locale: 'en-GB',
    ...overrides,
    store,
  });
  return { loadRates, copy, store };
}

beforeEach(() => {
  document.body.innerHTML = MARKUP.slice(MARKUP.indexOf('<body>') + 6, MARKUP.indexOf('</body>'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('initial render', () => {
  it("loads today's rates and shows the default currency", async () => {
    const deps = await mount();

    expect(deps.loadRates).toHaveBeenCalledExactlyOnceWith(TODAY);
    expect($<HTMLInputElement>('date').value).toBe(TODAY);
    expect($<HTMLSelectElement>('currency').value).toBe('USD');
    expect(text('rate-quantity')).toBe('1 USD');
    expect(text('rate-value')).toBe('2.5931');
    expect($('result').hidden).toBe(false);
    expect($('loading').hidden).toBe(true);
    expect($('error').hidden).toBe(true);
    expect($('note').hidden).toBe(true);
  });

  it('translates the static markup', async () => {
    await mount({ t: (key) => `[${key}]` });

    expect(text('copy-rate')).toBe('[copyRate]');
    expect($('prev-day').getAttribute('aria-label')).toBe('[prevDay]');
    expect($('rate').title).toBe('[rateHint]');
  });

  it('lists popular currencies first, then all of them', async () => {
    await mount();
    const groups = [...$('currency').querySelectorAll('optgroup')];

    expect(groups.map((group) => group.label)).toEqual(['Popular', 'All currencies']);
    expect([...(groups[0]?.children ?? [])].map((o) => (o as HTMLOptionElement).value)).toEqual([
      'USD',
      'EUR',
    ]);
    expect([...(groups[1]?.children ?? [])].map((o) => (o as HTMLOptionElement).value)).toEqual([
      'AMD',
      'EUR',
      'USD',
    ]);
    expect(groups[1]?.children[1]?.textContent).toBe('EUR — Euro');
  });

  it('restores the saved currency and amount', async () => {
    const store = memoryStore({ [SETTINGS_KEY]: { currency: 'EUR', amount: '50' } });
    await mount({ store });

    expect($<HTMLSelectElement>('currency').value).toBe('EUR');
    expect($<HTMLInputElement>('amount').value).toBe('50');
    expect($<HTMLInputElement>('gel').value).toBe('145.82');
  });

  it('falls back when the saved currency is not published', async () => {
    const store = memoryStore({ [SETTINGS_KEY]: { currency: 'XXX', amount: '1' } });
    await mount({ store });

    expect($<HTMLSelectElement>('currency').value).toBe('USD');
  });
});

describe('rate details', () => {
  it('shows the trend of the change', async () => {
    await mount();
    expect($('diff').dataset.trend).toBe('down');
    expect(text('diff')).toBe('▼ −0.0003');

    change('currency', 'EUR');
    expect($('diff').dataset.trend).toBe('up');
    expect(text('diff')).toBe('▲ +0.0036');

    change('currency', 'AMD');
    expect($('diff').dataset.trend).toBe('flat');
    expect(text('rate-quantity')).toBe('1000 AMD');
  });

  it('explains when the bank returned an earlier rate', async () => {
    await mount({ loadRates: async () => snapshotOf('2026-10-17') });

    expect($('note').hidden).toBe(false);
    expect(text('note')).toContain('17 Oct 2026');
  });

  it('remembers the chosen currency', async () => {
    const deps = await mount();
    change('currency', 'EUR');
    await flush();

    expect(await deps.store.get(SETTINGS_KEY)).toEqual({ currency: 'EUR', amount: '100' });
  });
});

describe('date navigation', () => {
  it('reloads when the date changes and keeps the selected currency', async () => {
    const deps = await mount();
    change('currency', 'EUR');
    change('date', '2026-09-01');
    await flush();

    expect(deps.loadRates).toHaveBeenLastCalledWith('2026-09-01');
    expect($<HTMLSelectElement>('currency').value).toBe('EUR');
  });

  it('steps a day back and forward', async () => {
    const deps = await mount();
    await click('prev-day');
    expect(deps.loadRates).toHaveBeenLastCalledWith('2026-10-21');

    await click('next-day');
    await click('next-day');
    expect(deps.loadRates).toHaveBeenLastCalledWith('2026-10-23');
  });

  it('does not go past tomorrow', async () => {
    await mount();
    expect($<HTMLInputElement>('date').max).toBe('2026-10-23');
    expect($<HTMLButtonElement>('next-day').disabled).toBe(false);

    await click('next-day');
    expect($<HTMLButtonElement>('next-day').disabled).toBe(true);
  });

  it('returns to today', async () => {
    const deps = await mount();
    change('date', '2020-01-15');
    await flush();
    await click('today');

    expect($<HTMLInputElement>('date').value).toBe(TODAY);
    expect(deps.loadRates).toHaveBeenLastCalledWith(TODAY);
  });

  it('ignores an incomplete date', async () => {
    const deps = await mount();
    change('date', '');
    await flush();

    expect(deps.loadRates).toHaveBeenCalledTimes(1);
  });

  it('ignores a slow response that was superseded', async () => {
    const pending: Array<(value: RatesSnapshot) => void> = [];
    const loadRates = vi
      .fn<AppDeps['loadRates']>()
      .mockResolvedValueOnce(snapshotOf(TODAY))
      .mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    await mount({ loadRates });

    change('date', '2026-09-01');
    change('date', '2026-09-02');
    pending[1]?.(snapshotOf('2026-09-02', [{ ...USD, rate: 2.2222 }]));
    await flush();
    pending[0]?.(snapshotOf('2026-09-01', [{ ...USD, rate: 1.1111 }]));
    await flush();

    expect(text('rate-value')).toBe('2.2222');
    expect($('loading').hidden).toBe(true);
  });
});

describe('errors', () => {
  it('reports missing data', async () => {
    await mount({ loadRates: async () => null });

    expect($('result').hidden).toBe(true);
    expect($('error').hidden).toBe(false);
    expect(text('error-text')).toBe(english.errorNoData.message);
  });

  it('reports a network failure and recovers on retry', async () => {
    const loadRates = vi
      .fn<AppDeps['loadRates']>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(snapshotOf(TODAY));
    await mount({ loadRates });

    expect(text('error-text')).toBe(english.errorNetwork.message);
    expect($('loading').hidden).toBe(true);

    await click('retry');
    expect($('error').hidden).toBe(true);
    expect($('result').hidden).toBe(false);
    expect(text('rate-value')).toBe('2.5931');
  });
});

describe('converter', () => {
  it('converts the amount to GEL as you type', async () => {
    await mount();
    expect($<HTMLInputElement>('gel').value).toBe('259.31');

    type('amount', '1 000,5');
    expect($<HTMLInputElement>('gel').value).toBe('2594.40');
  });

  it('converts GEL back to the currency', async () => {
    await mount();
    type('gel', '259.31');

    expect($<HTMLInputElement>('amount').value).toBe('100.00');
  });

  it('keeps the edited side when the currency changes', async () => {
    await mount();
    type('gel', '291.63');
    change('currency', 'EUR');

    expect($<HTMLInputElement>('gel').value).toBe('291.63');
    expect($<HTMLInputElement>('amount').value).toBe('100.00');
    expect(text('amount-code')).toBe('EUR');
  });

  it('clears the result for invalid input', async () => {
    await mount();
    type('amount', 'abc');

    expect($<HTMLInputElement>('gel').value).toBe('');
  });

  it('uses the quoted quantity', async () => {
    await mount();
    change('currency', 'AMD');
    type('amount', '50000');

    expect($<HTMLInputElement>('gel').value).toBe('358.66');
  });
});

describe('copying', () => {
  it.each(['rate', 'copy-rate'])('copies the rate from #%s', async (id) => {
    const deps = await mount();
    await click(id);

    expect(deps.copy).toHaveBeenCalledExactlyOnceWith('2.5931');
    expect(text('toast')).toBe('Copied: 2.5931');
  });

  it('copies a text summary with the effective date', async () => {
    const deps = await mount({ loadRates: async () => snapshotOf('2026-10-17', [EUR, AMD]) });
    await click('copy-line');

    expect(deps.copy).toHaveBeenCalledWith('1 EUR = 2.9163 GEL (2026-10-17)');
  });

  it('copies both converter fields', async () => {
    const deps = await mount();
    await click('copy-amount');
    await click('copy-gel');

    expect(deps.copy.mock.calls).toEqual([['100'], ['259.31']]);
  });

  it('does not copy an empty value', async () => {
    const deps = await mount();
    type('amount', '');
    await click('copy-gel');

    expect(deps.copy).not.toHaveBeenCalled();
  });

  it('reports a clipboard failure', async () => {
    await mount({ copy: async () => Promise.reject(new Error('denied')) });
    await click('copy-rate');

    expect(text('toast')).toBe(english.copyFailed.message);
  });

  it('hides the toast after a moment', async () => {
    await mount();
    vi.useFakeTimers();
    $('copy-rate').click();
    await vi.advanceTimersByTimeAsync(100);
    expect(text('toast')).toBe('Copied: 2.5931');

    await vi.advanceTimersByTimeAsync(2000);
    expect(text('toast')).toBe('');
  });
});

describe('floating window', () => {
  it('hides the button when detaching is unavailable', async () => {
    await mount();
    expect($('detach').hidden).toBe(true);
  });

  it('shows the button and detaches on click', async () => {
    const detach = vi.fn(async () => {});
    await mount({ detach });

    expect($('detach').hidden).toBe(false);
    expect($('detach').getAttribute('aria-label')).toBe(english.detach.message);
    await click('detach');
    expect(detach).toHaveBeenCalledTimes(1);
  });

  it('reports a failure to open the window', async () => {
    await mount({ detach: async () => Promise.reject(new Error('blocked')) });
    await click('detach');

    expect(text('toast')).toBe(english.detachFailed.message);
  });
});

describe('markup contract', () => {
  it('fails loudly when an element is missing', async () => {
    $('toast').remove();
    await expect(mount()).rejects.toThrow('#toast');
  });
});
