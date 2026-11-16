import './style.css';
import { browser } from 'wxt/browser';
import { browserStore } from '@/lib/browser-store';
import { createRatesCache, createRatesLoader } from '@/lib/cache';
import { todayInTbilisi } from '@/lib/dates';
import { isFloating, openFloatingWindow } from '@/lib/floating';
import { fetchRates } from '@/lib/nbg';
import { mountApp } from '@/popup/app';

const today = () => todayInTbilisi();
const locale = browser.i18n.getUILanguage();
const floating = isFloating(location.search);

document.documentElement.lang = locale;
document.documentElement.classList.toggle('floating', floating);

/** Keep the standalone window exactly as tall as its content. */
async function fitWindowToContent() {
  const { id } = await browser.windows.getCurrent();
  if (id === undefined) return;
  const chrome = window.outerHeight - window.innerHeight;
  const height = Math.ceil(document.documentElement.getBoundingClientRect().height) + chrome;
  if (height !== window.outerHeight) await browser.windows.update(id, { height });
}

void mountApp(document, {
  loadRates: createRatesLoader(createRatesCache(browserStore, { today }), (date) =>
    fetchRates(date),
  ),
  store: browserStore,
  copy: (text) => navigator.clipboard.writeText(text),
  t: (key, substitution) => browser.i18n.getMessage(key as never, substitution) || key,
  today,
  locale,
  detach: floating
    ? undefined
    : async () => {
        await openFloatingWindow({
          windows: browser.windows,
          store: browserStore,
          url: location.origin + location.pathname,
        });
        window.close();
      },
}).then(() => {
  if (!floating) return;
  new ResizeObserver(() => void fitWindowToContent().catch(() => undefined)).observe(
    document.documentElement,
  );
});
