# ADR-0002: FMP remains the primary full data provider

- **Status:** Accepted
- **Date:** 2026-10-08 (after PR #3)

## Context

Every strategy except Momentum, plus the DCF, needs financial statements, TTM ratios and growth data. PR #3 introduced a provider selector and tried Yahoo Finance as a keyless quote source.

Findings during PR #3:

- FMP returns `Access-Control-Allow-Origin: *` and works from a static page.
- Yahoo's `v7/finance/quote` returns **401** without a session crumb.
- Yahoo's `v8/finance/chart` returns data to server-side tools such as `curl`, but **sends no CORS headers**, so browsers block the response. In-browser testing confirmed the request fails ("Failed to fetch").
- Yahoo provides no market cap or fundamentals through that endpoint.

## Decision

- **FMP is the default and the only full provider:** quote, Deep Scan and DCF inputs.
- **Yahoo Finance is kept as "Experimental / Browser test only":**
  - quote-level only
  - Deep Scan blocked
  - clear warnings that it is likely CORS-blocked and not a reliable replacement
  - the scan stops after the first blocked request
- The provider layer (`getSelectedProvider`, `fetchStockDataByProvider`, `fetchQuoteData`) leaves the FMP scan path unchanged.

## Why Yahoo is experimental only

1. It is not an official or documented public API. There are no quotas, terms or stability guarantees.
2. It is blocked by browser CORS in this architecture.
3. It provides no fundamentals, so it can't support the app's purpose.
4. Making it usable would need a proxy, which [ADR-0003](ADR-0003-no-backend-yet.md) defers, and may raise terms-of-service issues.

## Consequences

- Users need an FMP key for meaningful results.
- FMP plan restrictions directly limit which categories are populated. The endpoint test and Data Confidence make this visible.
- Yahoo results, when they arrive at all, fail the basic filter because market cap is missing.
- Agents must not promote Yahoo or any other unofficial source to default.

## Revisit conditions

- An official provider with browser CORS support and fundamentals coverage becomes available, for example for TASE.
- A backend or proxy is approved, which would make server-side providers possible.
- FMP pricing, coverage or terms change materially.
