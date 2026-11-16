# Development guide

## Setup

```bash
git clone <your fork>
cd lari-rates
pnpm install        # also runs `wxt prepare`, which generates types into .wxt/
```

Node.js 22+ and pnpm 11+ are required (`.nvmrc` pins Node 22).

## Running

```bash
pnpm dev            # opens Chrome with the extension and hot reload
pnpm dev:firefox    # same for Firefox
```

WXT starts a clean browser profile. To use a specific browser binary or keep the profile, create
a `web-ext.config.ts` (git-ignored) — see
[WXT: browser startup](https://wxt.dev/guide/essentials/config/browser-startup.html).

To load a build by hand instead, run `pnpm build:all` and follow the install steps in the
[README](../README.md#install).

### Debugging the popup

- **Chrome:** right-click the toolbar icon → *Inspect popup*.
- **Firefox:** `about:debugging` → *This Firefox* → *Inspect*; enable *Disable popup auto-hide*
  in the toolbox menu so the popup stays open.
- The popup is an ordinary page: `chrome-extension://<id>/popup.html` or
  `moz-extension://<id>/popup.html` opens it in a tab.
- Stored data: DevTools → *Application* / *Storage* → *Extension storage*, keys `settings` and
  `ratesCache`. Clear `ratesCache` to force fresh requests.

## Tests

```bash
pnpm test            # once
pnpm test:watch      # watch mode
pnpm test:coverage   # coverage report in coverage/
```

| File | Covers |
| --- | --- |
| `tests/nbg.test.ts` | URL building, response validation, network/HTTP/JSON errors |
| `tests/cache.test.ts` | Cache lifetime, eviction, cache-first loader, broken storage |
| `tests/dates.test.ts` | Date validation, Tbilisi day boundary, arithmetic, formatting |
| `tests/format.test.ts` | Rounding, conversion, input parsing, copy text |
| `tests/settings.test.ts` | Settings validation and the `browser.storage` adapter |
| `tests/app.test.ts` | The popup end to end in happy-dom, using the real `index.html` |
| `tests/locales.test.ts` | Every locale has every key, placeholders and store length limits |

Conventions:

- Tests never touch the network. `fetchRates` takes a `fetch` option; the popup takes a
  `loadRates` dependency.
- `tests/helpers.ts` has an in-memory store and sample data shaped like the live API.
- Only `tests/app.test.ts` needs a DOM; it opts in with `// @vitest-environment happy-dom`.
- Rendering code must not swallow its own exceptions: `load()` in `app.ts` catches only the
  request, so a bug in rendering fails the test instead of looking like a network error.

A change is ready when `pnpm check` passes.

### Checking against the live API

Tests use fixtures, so after touching `lib/nbg.ts` also load the built extension in a browser
and look at a weekday, a Sunday and a currency quoted per 100 or 1000 (JPY, AMD).

## Common tasks

### Add an interface language

1. Copy `public/_locales/en/messages.json` to `public/_locales/<code>/messages.json` and translate
   the `message` values. Keep `$1` placeholders.
2. Add the code to the expected list in `tests/locales.test.ts`.
3. `extName` must stay within 45 characters and `extDescription` within 132 (store limits; the
   test checks this).

### Add or change a text

Add the key to **every** locale file, then use it via `data-i18n="key"` in `index.html` or
`t('key')` in `app.ts`. `tests/locales.test.ts` fails if a key used by the popup is missing.

### Change the popular currencies

Edit `POPULAR_CURRENCIES` in `src/popup/app.ts`. Codes the bank does not publish are skipped.

### Change the icon

Edit `src/assets/icon.svg`. `@wxt-dev/auto-icons` renders the PNG sizes at build time.

### Add a permission

Edit `manifest` in `wxt.config.ts`, document it in `PRIVACY.md`, and expect a new permission
prompt for existing users on update.

### Add a background script or options page

Create `src/entrypoints/background.ts` or `src/entrypoints/options/index.html` — WXT picks
entrypoints up by file name. Keep logic in `src/lib/` so it stays testable.

## Code style

Biome formats and lints (`pnpm lint:fix`). TypeScript runs in strict mode with
`noUncheckedIndexedAccess`. Prefer small pure functions in `src/lib/` and keep browser APIs at
the edge, as described in [ARCHITECTURE.md](ARCHITECTURE.md).

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Type errors about `browser` or `@/…` imports | Run `pnpm install` or `pnpm exec wxt prepare` to regenerate `.wxt/` |
| Popup shows "Could not load rates" in a dev build | Check the host permission was granted; in Firefox see `about:addons` → the extension → *Permissions* |
| Rate looks a day behind | Expected on weekends, holidays and Mondays — see [NBG-API.md](NBG-API.md) |
| Old data after changing parsing code | Clear `ratesCache` in extension storage |
