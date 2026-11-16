# Store listing kit

Everything needed to fill in a listing on the Chrome Web Store, Firefox Add-ons (AMO),
Edge Add-ons and Opera Add-ons. Images exist in English (`en/`) and Russian (`ru/`).

Regenerate the images after any change to the popup:

```bash
pnpm exec playwright-core install chromium   # once
pnpm store:assets
```

The script (`scripts/store-assets.mjs`) loads the real built extension in Chromium, takes popup
screenshots with live data from nbg.gov.ge and composes them into the images below. It also
refreshes `docs/screenshots/` used by the README.

## Images

| File                                                    | Size     | Chrome Web Store            | AMO         | Edge                                  | Opera       |
| ------------------------------------------------------- | -------- | --------------------------- | ----------- | ------------------------------------- | ----------- |
| `screenshot-1…4-1280x800.jpg`                           | 1280×800 | Screenshots (1–5)           | Screenshots | Screenshots (1–10)                    | Screenshots |
| `promo-small-440x280.jpg`                               | 440×280  | Small promo tile (required) | —           | Small promotional tile                | —           |
| `promo-marquee-1400x560.jpg`                            | 1400×560 | Marquee promo tile          | —           | Large promotional tile                | —           |
| `../src/assets/icon.svg` → `icons/128.png` in the build | 128×128  | Store icon                  | Icon        | Logo (300×300: export the SVG larger) | Icon        |

All images are JPEG without transparency, as the stores require.

## Texts

### Name

`Lari Rates — NBG exchange rates` (31 characters; the limit is 45 in Chrome, 50 in AMO)

### Summary (≤ 132 characters)

- **en:** Official National Bank of Georgia exchange rates for any date: look up, convert and copy in one click.
- **ru:** Официальные курсы валют Национального банка Грузии на любую дату: посмотреть, пересчитать и скопировать в один клик.

### Description — English

```
Lari Rates puts the official exchange rates of the National Bank of Georgia one click away.

• Any currency, any date — all currencies the bank publishes, with quick previous/next day buttons.
• One-click copy — copy the rate (2.9163) or a ready line: "1 EUR = 2.9163 GEL (2026-10-22)".
• Two-way converter — currency to lari or lari to currency. Understands "1 000,50" and "1000.50".
• Honest dates — on weekends and holidays the bank sets no rate; the extension shows the rate in force and the day it is valid from.
• Fast — past rates are cached on your device and open instantly.
• Floating window — keep the rates open in a separate window while you switch tabs.
• Keyboard shortcut — Alt+Shift+L.
• English, Russian and Georgian interface, light and dark themes.

Privacy: no analytics, no accounts, no ads. The only network request goes to nbg.gov.ge.

Note: the National Bank publishes one official rate per currency. Buy and sell prices are set by commercial banks and are not part of this data.

Lari Rates is an independent open-source project and is not affiliated with the National Bank of Georgia.
Source code: https://github.com/katokdoescode/lari-rates
```

### Description — Russian

```
Lari Rates — официальные курсы Национального банка Грузии в один клик.

• Любая валюта на любую дату — все валюты, которые публикует банк, с быстрым переходом на день назад и вперёд.
• Копирование в один клик — курс (2.9163) или готовая строка: «1 EUR = 2.9163 GEL (2026-10-22)».
• Конвертер в обе стороны — из валюты в лари и обратно. Понимает «1 000,50» и «1000.50».
• Честные даты — в выходные и праздники банк курс не устанавливает; плагин покажет действовавший курс и день, с которого он действует.
• Быстро — курсы за прошедшие дни хранятся на устройстве и открываются мгновенно.
• Плавающее окно — курсы остаются открытыми в отдельном окне, пока вы переключаете вкладки.
• Горячая клавиша — Alt+Shift+L.
• Интерфейс на английском, русском и грузинском, светлая и тёмная тема.

Приватность: без аналитики, аккаунтов и рекламы. Единственный сетевой запрос — к nbg.gov.ge.

Важно: Нацбанк публикует один официальный курс на валюту. Курсы покупки и продажи устанавливают коммерческие банки, в этих данных их нет.

Lari Rates — независимый проект с открытым кодом, не связанный с Национальным банком Грузии.
Исходный код: https://github.com/katokdoescode/lari-rates
```

### Category and tags

- Chrome Web Store: **Productivity → Tools** (or _Workflow & Planning_)
- AMO: **Other** / tags `currency`, `exchange rates`, `georgia`, `lari`, `gel`, `nbg`
- Edge: **Productivity**

### Permission justifications

See [docs/PUBLISHING.md](../docs/PUBLISHING.md#chrome-web-store) and [PRIVACY.md](../PRIVACY.md).
