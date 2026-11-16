import './style.css';
import { browser } from 'wxt/browser';
import { browserStore } from '@/lib/browser-store';
import { createRatesCache, createRatesLoader } from '@/lib/cache';
import { todayInTbilisi } from '@/lib/dates';
import { fetchRates } from '@/lib/nbg';
import { mountApp } from '@/popup/app';

const today = () => todayInTbilisi();
const locale = browser.i18n.getUILanguage();

document.documentElement.lang = locale;

void mountApp(document, {
  loadRates: createRatesLoader(createRatesCache(browserStore, { today }), (date) =>
    fetchRates(date),
  ),
  store: browserStore,
  copy: (text) => navigator.clipboard.writeText(text),
  t: (key, substitution) => browser.i18n.getMessage(key as never, substitution) || key,
  today,
  locale,
});
