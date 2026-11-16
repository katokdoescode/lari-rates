// Generates store screenshots and promo images from the real built extension.
// Usage: pnpm store:assets   (needs Chromium: `pnpm exec playwright-core install chromium`,
// or point CHROME_PATH at any Chromium/Chrome binary). Uses the live NBG API and downloads the Inter font from Google Fonts.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = resolve(import.meta.dirname, '..');
const EXTENSION = resolve(ROOT, '.output/chrome-mv3');
const OUT = resolve(ROOT, 'store');
const executablePath = process.env.CHROME_PATH || chromium.executablePath();
const FONT = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap';
const ICON = readFileSync(resolve(ROOT, 'src/assets/icon.svg'), 'utf8');

// Chrome derives the id of an unpacked extension from its absolute path.
const extensionId = [...createHash('sha256').update(EXTENSION).digest('hex').slice(0, 32)]
  .map((char) => String.fromCharCode(97 + Number.parseInt(char, 16)))
  .join('');

const COPY = {
  en: {
    lang: 'en-GB',
    uiLang: 'en-GB',
    tagline: 'Official NBG exchange rates',
    shots: [
      [
        'Official lari rates in one click',
        'National Bank of Georgia rates for 42 currencies, right in your toolbar.',
      ],
      [
        'Any date, honest answers',
        'Weekend or holiday? You see the rate that was in force and the day it is valid from.',
      ],
      [
        'Convert and copy',
        'A two-way converter. Copy the rate, the amount or a ready-made line of text.',
      ],
      [
        'Light, dark, trilingual',
        'English, Russian and Georgian. No tracking, no accounts — only nbg.gov.ge.',
      ],
    ],
  },
  ru: {
    lang: 'ru-RU',
    uiLang: 'ru',
    tagline: 'Официальные курсы НБГ',
    shots: [
      [
        'Официальный курс лари в один клик',
        'Курсы Национального банка Грузии для 42 валют — прямо на панели браузера.',
      ],
      [
        'Любая дата, честный ответ',
        'Выходной или праздник? Плагин покажет действовавший курс и день, с которого он действует.',
      ],
      [
        'Пересчитать и скопировать',
        'Конвертер в обе стороны. Копируйте курс, сумму или готовую строку текста.',
      ],
      [
        'Светлая и тёмная тема, три языка',
        'Английский, русский и грузинский. Без слежки и аккаунтов — только nbg.gov.ge.',
      ],
    ],
  },
};

/** What the popup shows in each screenshot. */
const SCENES = [
  { currency: 'EUR', date: '2026-10-22', amount: '100' },
  { currency: 'USD', date: '2026-10-25', amount: '100' },
  { currency: 'USD', date: '2026-10-22', amount: '1 250,50', click: '#copy-gel' },
  { currency: 'GBP', date: '2026-10-22', amount: '100', dark: true },
];

async function capturePopups({ lang, uiLang }) {
  const shots = [];
  for (const colorScheme of ['light', 'dark']) {
    const context = await chromium.launchPersistentContext('', {
      executablePath,
      headless: false,
      colorScheme,
      locale: lang,
      env: {
        ...process.env,
        LANGUAGE: uiLang.replace('-', '_'),
        LANG: `${lang.replace('-', '_')}.UTF-8`,
      },
      deviceScaleFactor: 2,
      viewport: { width: 340, height: 600 },
      args: [
        '--headless=new',
        `--lang=${uiLang}`,
        `--disable-extensions-except=${EXTENSION}`,
        `--load-extension=${EXTENSION}`,
      ],
    });
    const page = await context.newPage();
    for (const [index, scene] of SCENES.entries()) {
      if (Boolean(scene.dark) !== (colorScheme === 'dark')) continue;
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      await page.waitForSelector('#result:not([hidden])');
      await page.fill('#date', scene.date);
      await page.dispatchEvent('#date', 'change');
      await page.waitForFunction(
        (date) =>
          document.querySelector('#loading').hidden &&
          document.querySelector('#date').value === date,
        scene.date,
      );
      await page.waitForTimeout(300);
      await page.selectOption('#currency', scene.currency);
      await page.fill('#amount', scene.amount);
      if (scene.click) await page.click(scene.click);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => document.activeElement?.blur());
      await page.mouse.move(0, 0);
      shots[index] = await page.locator('main').screenshot();
    }
    await context.close();
  }
  return shots;
}

/** Inter with the font files inlined, so rendering does not depend on network timing. */
async function inlineFontCss() {
  const headers = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0 Safari/537.36' };
  let css = await (await fetch(FONT, { headers })).text();
  for (const url of new Set(css.match(/https:[^)]+/g))) {
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    css = css.replaceAll(url, `data:font/woff2;base64,${bytes.toString('base64')}`);
  }
  return css;
}
const fontCss = await inlineFontCss();

const dataUrl = (png) => `data:image/png;base64,${png.toString('base64')}`;
const iconUrl = `data:image/svg+xml;base64,${Buffer.from(ICON).toString('base64')}`;

const baseCss = `
  ${fontCss}
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Inter, sans-serif; color: #fff; overflow: hidden;
    background: radial-gradient(120% 140% at 0% 0%, #14b8a6 0%, #0f766e 45%, #134e4a 100%); }
  body.dark { background: radial-gradient(120% 140% at 0% 0%, #1f2937 0%, #111827 55%, #030712 100%); }
  .brand { display: flex; align-items: center; gap: 14px; font-weight: 600; }
  .brand img { border-radius: 22%; box-shadow: 0 6px 20px rgb(0 0 0 / 25%); }
  .popup { border-radius: 18px; box-shadow: 0 30px 80px rgb(0 0 0 / 40%), 0 0 0 1px rgb(255 255 255 / 12%); display: block; }
`;

function screenshotPage([title, text], popup, dark) {
  return `<body class="${dark ? 'dark' : ''}"><style>${baseCss}
    body { width: 1280px; height: 800px; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 60px; padding: 0 90px; }
    .brand { font-size: 26px; margin-bottom: 44px; }
    h1 { font-size: 62px; line-height: 1.08; font-weight: 800; letter-spacing: -0.02em; }
    p { margin-top: 26px; font-size: 27px; line-height: 1.4; opacity: 0.88; max-width: 560px; }
    .popup { width: 442px; }
  </style>
  <section><div class="brand"><img src="${iconUrl}" width="52" height="52" alt="">Lari Rates</div>
  <h1>${title}</h1><p>${text}</p></section>
  <img class="popup" src="${dataUrl(popup)}" alt=""></body>`;
}

function smallTilePage(copy) {
  return `<body><style>${baseCss}
    body { width: 440px; height: 280px; display: grid; place-content: center; justify-items: center; gap: 16px; text-align: center; }
    h1 { font-size: 40px; font-weight: 800; letter-spacing: -0.02em; }
    p { font-size: 18px; opacity: 0.9; }
  </style><img src="${iconUrl}" width="92" height="92" alt="" style="border-radius:22%;box-shadow:0 8px 24px rgb(0 0 0 / 28%)">
  <div><h1>Lari Rates</h1><p>${copy.tagline}</p></div></body>`;
}

function marqueePage(copy, popup) {
  return `<body><style>${baseCss}
    body { width: 1400px; height: 560px; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 80px; padding: 0 130px; }
    .brand { font-size: 84px; font-weight: 800; letter-spacing: -0.03em; gap: 30px; }
    p { margin-top: 30px; font-size: 36px; opacity: 0.9; }
    .popup { width: 400px; margin-top: 150px; }
  </style><section><div class="brand"><img src="${iconUrl}" width="120" height="120" alt="">Lari Rates</div>
  <p>${copy.shots[0][0]}</p></section>
  <img class="popup" src="${dataUrl(popup)}" alt=""></body>`;
}

async function main() {
  const browser = await chromium.launch({ executablePath });
  const render = async (html, width, height, path) => {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // The stores reject PNGs with an alpha channel, so screenshots are saved as JPEG.
    await page.screenshot({
      path,
      type: path.endsWith('.jpg') ? 'jpeg' : 'png',
      quality: path.endsWith('.jpg') ? 95 : undefined,
    });
    await page.close();
    console.log('✔', path.replace(`${ROOT}/`, ''));
  };

  for (const [locale, copy] of Object.entries(COPY)) {
    const popups = await capturePopups(copy);
    const dir = resolve(OUT, locale);
    mkdirSync(dir, { recursive: true });
    for (const [index, shot] of copy.shots.entries()) {
      const html = screenshotPage(shot, popups[index], SCENES[index].dark);
      await render(html, 1280, 800, resolve(dir, `screenshot-${index + 1}-1280x800.jpg`));
    }
    await render(smallTilePage(copy), 440, 280, resolve(dir, 'promo-small-440x280.jpg'));
    await render(
      marqueePage(copy, popups[0]),
      1400,
      560,
      resolve(dir, 'promo-marquee-1400x560.jpg'),
    );
    if (locale === 'en') {
      const page = await browser.newPage();
      for (const [name, index] of [
        ['light', 0],
        ['dark', 3],
      ]) {
        await page.setContent(
          `<body style="margin:0"><img src="${dataUrl(popups[index])}" width="340"></body>`,
        );
        await page
          .locator('img')
          .screenshot({ path: resolve(ROOT, `docs/screenshots/popup-${name}.png`) });
      }
      await page.close();
    }
  }
  await browser.close();
}

await main();
