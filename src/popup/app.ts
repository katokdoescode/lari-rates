import type { RatesLoader } from '../lib/cache';
import { formatDisplayDate, isIsoDate, shiftDate } from '../lib/dates';
import {
  type ConvertDirection,
  convert,
  formatAmount,
  formatDiff,
  formatRate,
  parseAmount,
  rateLine,
  trendOf,
} from '../lib/format';
import { loadSettings, saveSettings } from '../lib/settings';
import type { CurrencyRate, KeyValueStore, RatesSnapshot } from '../lib/types';

export const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'TRY'];
const TOAST_MS = 1800;
const TREND_ARROWS = { up: '▲', down: '▼', flat: '•' } as const;

export interface AppDeps {
  /** Load all rates for a day (`null` = the bank has no data). */
  loadRates: RatesLoader;
  /** Persistent storage for user settings. */
  store: KeyValueStore;
  /** Write text to the clipboard. */
  copy: (text: string) => Promise<void>;
  /** Translate a message key; `$1` is replaced with `substitution`. */
  t: (key: string, substitution?: string) => string;
  /** Current day in Tbilisi, `YYYY-MM-DD`. */
  today: () => string;
  /** BCP 47 UI locale, used for dates and currency names. */
  locale?: string;
  /** Move the popup into its own window. Omit where that is unavailable or already done. */
  detach?: () => Promise<void>;
}

/** Wire the popup markup found in `root` to the given dependencies. */
export async function mountApp(root: ParentNode, deps: AppDeps): Promise<void> {
  const { t } = deps;
  const el = <T extends HTMLElement>(id: string) => {
    const node = root.querySelector<T>(`#${id}`);
    if (!node) throw new Error(`Popup markup is missing #${id}`);
    return node;
  };

  const currencySelect = el<HTMLSelectElement>('currency');
  const dateInput = el<HTMLInputElement>('date');
  const prevDay = el<HTMLButtonElement>('prev-day');
  const nextDay = el<HTMLButtonElement>('next-day');
  const result = el('result');
  const diff = el('diff');
  const note = el('note');
  const amountInput = el<HTMLInputElement>('amount');
  const gelInput = el<HTMLInputElement>('gel');
  const error = el('error');
  const loading = el('loading');
  const toast = el('toast');

  const settings = await loadSettings(deps.store);
  const maxDate = shiftDate(deps.today(), 1);
  let snapshot: RatesSnapshot | null = null;
  let requestId = 0;
  let lastEdited: ConvertDirection = 'toGel';
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const currencyNames = createCurrencyNames(deps.locale);
  const selected = (): CurrencyRate | undefined =>
    snapshot?.currencies.find((c) => c.code === currencySelect.value);

  function translateMarkup() {
    for (const node of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
      node.textContent = t(node.dataset.i18n ?? '');
    }
    for (const node of root.querySelectorAll<HTMLElement>('[data-i18n-title]')) {
      node.title = t(node.dataset.i18nTitle ?? '');
    }
    for (const node of root.querySelectorAll<HTMLElement>('[data-i18n-label]')) {
      const label = t(node.dataset.i18nLabel ?? '');
      node.setAttribute('aria-label', label);
      node.title = label;
    }
  }

  function showToast(text: string) {
    toast.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.textContent = '';
    }, TOAST_MS);
  }

  async function copy(text: string) {
    if (!text) return;
    try {
      await deps.copy(text);
      showToast(t('copied', text));
    } catch {
      showToast(t('copyFailed'));
    }
  }

  function fillCurrencies(currencies: CurrencyRate[]) {
    const wanted = currencySelect.value || settings.currency;
    const option = (c: CurrencyRate) => {
      const node = document.createElement('option');
      node.value = c.code;
      node.textContent = `${c.code} — ${currencyNames(c)}`;
      return node;
    };
    const group = (label: string, items: CurrencyRate[]) => {
      const node = document.createElement('optgroup');
      node.label = label;
      node.append(...items.map(option));
      return node;
    };
    const popular = POPULAR_CURRENCIES.flatMap((code) => currencies.filter((c) => c.code === code));
    currencySelect.replaceChildren(
      ...(popular.length > 0 ? [group(t('popular'), popular)] : []),
      group(t('allCurrencies'), currencies),
    );
    const fallback = popular[0] ?? currencies[0];
    currencySelect.value = currencies.some((c) => c.code === wanted)
      ? wanted
      : (fallback?.code ?? '');
  }

  function renderConverter(currency: CurrencyRate) {
    const [source, target] =
      lastEdited === 'toGel' ? [amountInput, gelInput] : [gelInput, amountInput];
    const amount = parseAmount(source.value);
    target.value = amount === null ? '' : formatAmount(convert(amount, currency, lastEdited));
  }

  function render() {
    const currency = selected();
    if (!snapshot || !currency) return;
    el('rate-quantity').textContent = `${currency.quantity} ${currency.code}`;
    el('rate-value').textContent = formatRate(currency.rate);
    const trend = trendOf(currency.diff);
    diff.dataset.trend = trend;
    diff.textContent = `${TREND_ARROWS[trend]} ${formatDiff(currency.diff)}`;
    note.hidden = snapshot.date === dateInput.value;
    note.textContent = note.hidden
      ? ''
      : t('noteEffective', formatDisplayDate(snapshot.date, deps.locale));
    el('amount-code').textContent = currency.code;
    renderConverter(currency);
  }

  function updateDateButtons() {
    nextDay.disabled = dateInput.value >= maxDate;
  }

  async function load() {
    const date = dateInput.value;
    if (!isIsoDate(date)) return;
    updateDateButtons();
    const id = ++requestId;
    loading.hidden = false;
    error.hidden = true;
    // Only the request itself may fail here; rendering bugs must not look like network errors.
    const outcome = await deps.loadRates(date).then(
      (loaded) => ({ loaded }),
      () => ({ failed: true as const }),
    );
    if (id !== requestId) return;
    loading.hidden = true;
    if ('failed' in outcome) return showError('errorNetwork');
    if (!outcome.loaded) return showError('errorNoData');
    snapshot = outcome.loaded;
    fillCurrencies(snapshot.currencies);
    result.hidden = false;
    render();
  }

  function showError(key: string) {
    snapshot = null;
    result.hidden = true;
    error.hidden = false;
    el('error-text').textContent = t(key);
  }

  function setDate(date: string) {
    dateInput.value = date > maxDate ? maxDate : date;
    return load();
  }

  const persist = () =>
    saveSettings(deps.store, { currency: currencySelect.value, amount: amountInput.value });

  translateMarkup();
  amountInput.value = settings.amount;
  dateInput.max = maxDate;

  currencySelect.addEventListener('change', () => {
    render();
    void persist();
  });
  dateInput.addEventListener('change', () => void load());
  prevDay.addEventListener('click', () => void setDate(shiftDate(dateInput.value, -1)));
  nextDay.addEventListener('click', () => void setDate(shiftDate(dateInput.value, 1)));
  el('today').addEventListener('click', () => void setDate(deps.today()));
  el('retry').addEventListener('click', () => void load());

  amountInput.addEventListener('input', () => {
    lastEdited = 'toGel';
    render();
    void persist();
  });
  gelInput.addEventListener('input', () => {
    lastEdited = 'fromGel';
    render();
  });

  const copyRate = () => {
    const currency = selected();
    return copy(currency ? formatRate(currency.rate) : '');
  };
  el('rate').addEventListener('click', () => void copyRate());
  el('copy-rate').addEventListener('click', () => void copyRate());
  el('copy-line').addEventListener('click', () => {
    const currency = selected();
    void copy(currency && snapshot ? rateLine(currency, snapshot.date) : '');
  });
  el('copy-amount').addEventListener('click', () => void copy(amountInput.value.trim()));
  el('copy-gel').addEventListener('click', () => void copy(gelInput.value.trim()));

  if (deps.detach) {
    const { detach } = deps;
    const button = el<HTMLButtonElement>('detach');
    button.hidden = false;
    button.addEventListener('click', () => void detach().catch(() => showToast(t('detachFailed'))));
  }

  await setDate(deps.today());
}

/** Localised currency names with the API's English name as a fallback. */
function createCurrencyNames(locale?: string): (currency: CurrencyRate) => string {
  let names: Intl.DisplayNames | undefined;
  try {
    names = new Intl.DisplayNames(locale ? [locale] : undefined, { type: 'currency' });
  } catch {
    names = undefined;
  }
  return (currency) => {
    try {
      const name = names?.of(currency.code);
      return name && name !== currency.code ? name : currency.name;
    } catch {
      return currency.name;
    }
  };
}
