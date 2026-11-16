# Architecture

Lari Rates is a single popup. There is no background script, no content script and no options
page: everything happens while the popup is open.

```
┌──────────────────────── popup.html ────────────────────────┐
│ entrypoints/popup/main.ts   composition root               │
│   │  wires real browser APIs into ↓                        │
│   ▼                                                        │
│ popup/app.ts  mountApp(root, deps)   UI behaviour          │
│   │ deps.loadRates(date)        │ deps.store   │ deps.copy │
│   ▼                             ▼              ▼           │
│ lib/cache.ts  createRatesLoader    lib/settings.ts   clipboard
│   ├─ cache hit ── lib/cache.ts createRatesCache ─┐         │
│   └─ miss ─────── lib/nbg.ts fetchRates          │         │
│                        │                         ▼         │
└────────────────────────┼──────────── browser.storage.local ┘
                         ▼
                  nbg.gov.ge JSON API
```

## Design decisions

### Dependency injection instead of mocks

`mountApp` receives everything that touches the outside world — the rates loader, storage, the
clipboard, the translator, the clock — as an `AppDeps` object. `main.ts` is the only file that
knows about `browser.*`, `fetch` and `navigator.clipboard` (plus the 12-line storage adapter in
`lib/browser-store.ts`).

Consequences:

- The whole popup runs in Vitest + happy-dom against the real `index.html`, with plain functions
  as fakes. No module mocking, no global patching.
- Time is deterministic in tests: `today()` and `now()` are parameters, not `new Date()` calls.

### One request per day, all currencies

The API can filter by currency, but the popup always asks for the full list (42 entries, ~8 kB).
Switching currency is then instant, the currency selector is built from real data instead of a
hard-coded list, and the cache needs just one entry per day.

### JSON, not RSS

Both feeds carry the same data. JSON needs no XML parser and has numeric `rate`, `diff` and
`quantity` fields, so nothing has to be scraped out of formatted text.

### Caching rules

`createRatesCache` stores snapshots under the **requested** day in `storage.local`
(key `ratesCache`).

| Requested day    | Lifetime      | Why                                                                                           |
| ---------------- | ------------- | --------------------------------------------------------------------------------------------- |
| today or earlier | until evicted | a published rate never changes                                                                |
| in the future    | 10 minutes    | the API answers with the latest known rate, which the bank replaces around 17:00 Tbilisi time |

At most 60 days are kept; the oldest saved entries are dropped first. "No data" answers and
errors are never cached. Storage failures are swallowed — a broken cache only costs a request.

### Dates

- The bank works on Tbilisi time (UTC+4, no daylight saving). "Today" is computed in that zone
  (`todayInTbilisi`), not in the user's, so the default date matches the bank's site wherever
  the user is.
- Days travel through the code as `YYYY-MM-DD` strings. They compare correctly with `<` and match
  both the `<input type="date">` value and the API parameter. `Date` objects are used only for
  arithmetic, always in UTC.
- The date picker is capped at tomorrow: the bank publishes the next day's rate in the evening and
  nothing beyond that.

### Requested day vs. effective day

The API never says "no rate on this day" for weekends and holidays — it returns the latest
earlier rate, with that rate's own date. The popup compares `snapshot.date` with the requested
day and shows a notice when they differ. **Copy as text** uses the effective date, so the pasted
line is always true.

### Stale responses

Each load gets an incrementing id. A response whose id is no longer the latest is discarded, so
clicking quickly through days cannot leave an older day on screen.

### Numbers

- Rates are shown and copied with four decimals and a dot, exactly as the bank prints them.
- The converter uses `rate / quantity` (the dram is quoted per 1000, the yen per 100) and rounds
  results to two decimals.
- Input accepts spaces and a decimal comma.

### Manifest versions

WXT builds Manifest V3 for Chromium and Manifest V2 for Firefox from the same source.
Firefox MV2 is deliberate: in Firefox MV3 host permissions are optional and can be withheld by
the user, which would silently break the request to the API (it sends no CORS headers).
`wxt.config.ts` contains the few per-browser differences (command name, Gecko settings).

### Localisation

Interface strings use the standard `_locales` mechanism (`browser.i18n`). Static markup is
translated through `data-i18n`, `data-i18n-title` and `data-i18n-label` attributes. Currency
names come from the browser's own `Intl.DisplayNames`, so they are localised for free; the
API's English name is the fallback.

## Module reference

| Module                 | Exports                                                                                     | Notes                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `lib/nbg.ts`           | `buildRatesUrl`, `parseRatesResponse`, `fetchRates`, `NbgError`                             | Validates every field it uses; `NbgError.kind` is `network`, `http` or `format` |
| `lib/cache.ts`         | `createRatesCache`, `createRatesLoader`                                                     | Cache-first loader with the rules above                                         |
| `lib/dates.ts`         | `isIsoDate`, `todayInTbilisi`, `shiftDate`, `formatDisplayDate`                             | Pure functions                                                                  |
| `lib/format.ts`        | `formatRate`, `formatAmount`, `convert`, `parseAmount`, `trendOf`, `formatDiff`, `rateLine` | Pure functions                                                                  |
| `lib/settings.ts`      | `loadSettings`, `saveSettings`                                                              | Validates what it reads; falls back to USD / 100                                |
| `lib/browser-store.ts` | `browserStore`                                                                              | `KeyValueStore` over `browser.storage.local`                                    |
| `popup/app.ts`         | `mountApp`, `AppDeps`, `POPULAR_CURRENCIES`                                                 | All popup behaviour                                                             |

## Storage schema

```jsonc
// browser.storage.local
{
  "settings": { "currency": "EUR", "amount": "100" },
  "ratesCache": {
    "2026-10-22": {
      "savedAt": 1792345678901,
      "snapshot": {
        "date": "2026-10-22",
        "currencies": [
          { "code": "EUR", "name": "Euro", "quantity": 1, "rate": 2.9163, "diff": 0.0036 }
        ]
      }
    }
  }
}
```
