# Privacy

Lari Rates collects nothing.

- **Network.** The extension makes one kind of request: `GET` to
  `https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/?date=YYYY-MM-DD`,
  the public API of the National Bank of Georgia. The request contains the date you selected and
  nothing about you. The bank's server sees your IP address, as any website you visit does.
- **Storage.** The last currency and amount you used, and a cache of downloaded rates, are kept in
  the browser's local extension storage (`storage.local`). They never leave your device and are
  deleted when you remove the extension.
- **Clipboard.** The extension writes to the clipboard only when you press a copy button.
  It never reads the clipboard.
- **No analytics, no tracking, no ads, no third parties.**

## Permissions

| Permission             | Why                                                                       |
| ---------------------- | ------------------------------------------------------------------------- |
| `storage`              | Remember the last currency/amount and cache rates                         |
| `https://nbg.gov.ge/*` | Read the bank's API, which does not allow cross-origin requests otherwise |
