# National Bank of Georgia currency API

The bank does not publish formal documentation for this endpoint. Everything below was observed
against the live API in November 2026 and is covered by the parser tests in `tests/nbg.test.ts`.

## Endpoint

```
GET https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/{lang}/json/
GET https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/{lang}/rss/
```

| Parameter    | Example            | Meaning                                                                                                                                        |
| ------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `{lang}`     | `en`               | Language of currency names. `en` works and is what the extension uses; `ru` answers `422`; `ka` answered `200` with an empty list in our check |
| `date`       | `2026-10-22`       | Day the rate should be valid on. Optional — defaults to the latest rate                                                                        |
| `currencies` | `EUR` or `EUR,USD` | Filter. Optional — defaults to all currencies                                                                                                  |

The extension uses `/en/json/?date=…` without a currency filter.

## Response

```json
[
  {
    "date": "2026-10-22T00:00:00.000Z",
    "currencies": [
      {
        "code": "EUR",
        "quantity": 1,
        "rateFormated": "2.9163",
        "diffFormated": "0.0036",
        "rate": 2.9163,
        "name": "Euro",
        "diff": 0.0036,
        "date": "2026-10-21T17:01:13.285Z",
        "validFromDate": "2026-10-22T00:00:00.000Z"
      }
    ]
  }
]
```

| Field            | Meaning                                                          |
| ---------------- | ---------------------------------------------------------------- |
| top-level `date` | Day the rates are valid **from** (same as `validFromDate`)       |
| `quantity`       | Units the rate is quoted for: `1`, `10`, `100` or `1000`         |
| `rate`           | GEL for `quantity` units                                         |
| `diff`           | Signed change since the previous rate                            |
| `diffFormated`   | **Unsigned** — do not use it to tell direction                   |
| inner `date`     | When the rate was published (about 17:00 Tbilisi the day before) |

## Behaviour worth knowing

- **One official rate.** There are no buy/sell prices; the bank does not publish any.
- **Weekends and holidays.** No error — the API returns the latest earlier rate with _its_ date.
  Asking for Sunday 2026-10-25 returns `date: 2026-10-24`. Friday's publication is dated
  Saturday, so Monday also shows a Saturday date.
- **Future days** return the latest known rate. After ~17:00 Tbilisi time that is tomorrow's.
- **Unparseable `date`** (`date=abc`) is ignored and treated as "latest".
- **Before the data starts** (for example `1990-01-01`) or with an unknown currency code the
  answer is `[]` with status `200`.
- **No CORS headers.** A web page cannot read the response; an extension needs host permission
  for `https://nbg.gov.ge/*`.
- **Currency list** (42 at the time of writing): AED AMD AUD AZN BRL BYN CAD CHF CNY CZK DKK EGP
  EUR GBP HKD HUF ILS INR IRR ISK JPY KGS KRW KWD KZT MDL NOK NZD PLN QAR RON RSD RUB SEK SGD TJS
  TMT TRY UAH USD UZS ZAR. The list is not hard-coded in the extension.

## Checking by hand

```bash
curl -s 'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/?currencies=EUR&date=2026-10-22'
```

If the API changes shape, `parseRatesResponse` throws `NbgError('format')`, the popup shows the
"could not load" message, and the tests in `tests/nbg.test.ts` are the place to start.
