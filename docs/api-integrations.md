# API Integrations

Last updated: 2026-10-08 (after PR #3)

## 1. Financial Modeling Prep (FMP): primary provider

**Status:** Current, default, full provider (quote + Deep Scan + DCF inputs). Decision: [ADR-0002](decisions/ADR-0002-fmp-primary-provider.md).

### Endpoint families currently used

All endpoints are requested as `https://financialmodelingprep.com{path}?symbol={SYMBOL}&apikey={KEY}[&extra]`.

| Key | Label | Path | Extra params | Mode |
| --- | --- | --- | --- | --- |
| quote | Quote | `/stable/quote` | — | Quick + Deep |
| profile | Profile | `/stable/profile` | — | Deep |
| ratiosTtm | Ratios TTM | `/stable/ratios-ttm` | — | Deep |
| keyMetricsTtm | Key Metrics TTM | `/stable/key-metrics-ttm` | — | Deep |
| ratiosAnnual | Ratios Annual | `/stable/ratios` | `period=annual&limit=5` | Deep |
| keyMetricsAnnual | Key Metrics Annual | `/stable/key-metrics` | `period=annual&limit=5` | Deep |
| income | Income Statement | `/stable/income-statement` | `period=annual&limit=5` | Deep |
| cash | Cash Flow | `/stable/cash-flow-statement` | `period=annual&limit=5` | Deep |
| balance | Balance Sheet | `/stable/balance-sheet-statement` | `period=annual&limit=5` | Deep |
| growth | Financial Growth | `/stable/financial-growth` | `period=annual&limit=5` | Deep |

Request cost: **1 per symbol** (Momentum) or **10 per symbol** (Deep), minus cache hits.

### Why FMP is the main provider

- It is an official API with a documented key-based model.
- It returns `Access-Control-Allow-Origin: *`, so it works directly from a static browser page.
- One provider covers quotes, TTM ratios, annual statements and growth, which is everything the strategies and DCF need.

### API key handling

- The user types the key into **API Key (FMP)**. It is saved to `localStorage["valueStockFinderApiKey"]` when a scan or test runs.
- The key is sent as the `apikey` **query parameter**. This is FMP's scheme, and it means the key appears in request URLs in dev tools.
- Cache keys never include the API key.
- See [security.md](security.md) for the risks.

### Caching

- `localStorage` key: `valueStockFinderFmpCache:{path}|{symbol}|{sorted extra params JSON}`.
- TTL: **10 minutes** for `/stable/quote`, **7 days** for all fundamentals.
- A cache hit costs no API call. The request preview counts cache hits ahead of time.
- **Clear Cache** removes every FMP and Yahoo entry.

### Rate limits and restricted endpoints

| Condition | Detection | Behavior |
| --- | --- | --- |
| Rate limit | HTTP 429, or response text containing "limit reach", "rate limit", "too many requests", "daily limit" and similar | Throws `rateLimited`. The scan stops, partial results are rendered and a warning appears. |
| Restricted endpoint | Text "restricted endpoint" or "not available under your current subscription" | Recorded as `Label: Restricted Endpoint`. That data is missing and the scan continues. |
| Other HTTP error | Non-2xx | Recorded per endpoint. The scan continues. |

Use **בדוק endpoints על AAPL** to see which endpoints your plan allows.

## 2. Yahoo Finance Experimental / Browser test only

**Status:** Experimental. It is **not** an official API, **not** unlimited, and **not** a replacement for FMP.

### What it does

- `GET https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}?interval=1d&range=1y`, with no key.
- `yahooChartToQuote` maps the response to FMP-style quote fields:

| App field | Yahoo source |
| --- | --- |
| price | `meta.regularMarketPrice` |
| changePercentage | `meta.regularMarketChangePercent` (fallback: last two closes) |
| volume | `meta.regularMarketVolume` |
| yearHigh / yearLow | `meta.fiftyTwoWeekHigh` / `fiftyTwoWeekLow` |
| priceAvg50 / priceAvg200 | Mean of the last 50 / 200 daily closes |
| name | `meta.longName` / `shortName` |
| exchange | `meta.fullExchangeName` / `exchangeName` |
| marketCap | **not available (null)** |

- Cache: `valueStockFinderYahooCache:{symbol}`, 10 minutes.
- Request preview: "Yahoo Experimental / Browser test only: quote-level scan only… Browser/CORS may block these requests. This is not a reliable replacement for FMP."

### Why Yahoo is not a replacement today

1. **CORS:** the endpoint does not return CORS headers, so browsers block the page from reading the response. In testing, the browser request failed with "Failed to fetch".
2. **Unofficial:** no documented terms, quotas or stability guarantees. The older `v7/finance/quote` endpoint already returns 401 without a session crumb.
3. **Quote-level only:** no market cap (so rows fail the basic filter), no statements, no ratios and no DCF.
4. **Deep Scan is blocked** when Yahoo is selected.

### Failure handling

| Failure | Behavior |
| --- | --- |
| Network/CORS error, HTTP 401/403 | `providerBlocked`. The scan **stops after the first failure** with: "Yahoo quote request failed. This may be blocked by browser/CORS or Yahoo restrictions." |
| HTTP 429 | Rate-limit path, labeled Yahoo |
| Other HTTP error / invalid payload | Recorded for that symbol. The scan continues. |

The **בדוק ספק נבחר (AAPL)** button makes exactly one request, on demand.

## 3. Future provider abstraction options (not implemented)

| Option | Benefit | Cost / risk |
| --- | --- | --- |
| Capability-based provider interface (`quote`, `fundamentals`, `history`, `universe`) | Cleaner multi-provider support | Refactor of the provider layer |
| Serverless proxy | Hides keys, adds CORS for providers like Yahoo, shared cache | Backend, hosting, terms of service. Needs an ADR. |
| Additional official providers (for example for TASE) | Market coverage | Different schemas, keys and limits |
| Per-field provider fallback | Fills gaps | Mixed-source data, which must be shown in Data Confidence |

Any new provider must be labeled honestly, must not become the default without approval, and must not degrade the FMP path.
