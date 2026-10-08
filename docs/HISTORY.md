# Project History

Last updated: 2026-10-08

## Timeline

| # | Change | Commit on `main` | Highlights |
| --- | --- | --- | --- |
| 0 | **Initial website** | `238d062` | Single-file value stock finder: Hebrew RTL UI, 4 US preset lists, FMP quote + deep endpoints, Momentum/Graham/Fisher/Cash/Buffett/Piotroski/Dreman/Neff scoring, results table, CSV export |
| 1 | **PR #1: Improve caching and scoring confidence** (merged 2026-08-30) | `647b759` | Local FMP cache (quotes 10 min, fundamentals 7 days), request preview, stop scan, rate-limit handling, EPS CAGR and Graham total EPS growth fix, Data Confidence, safer labels |
| 2 | **PR #2: Add DCF estimates and relative comparison basis** (merged 2026-08-30) | `339d5c7` | DCF assumption inputs, Estimated Fair Value, Fair Value / Current Price / Upside / Discount / Margin of Safety columns, DCF Confidence and details, explicit relative basis (industry → sector → scanned list) for Dreman/Neff, US vs non-US market-cap threshold |
| 3 | **PR #3: Add data provider abstraction and Yahoo experimental quotes** (merged 2026-10-08) | `09dbd5d` | Data Provider selector, FMP stays full/default, Yahoo Finance Experimental / Browser test only (quote-level mapping, Deep Scan blocked, CORS warnings), selected-provider test button, CSV `dataProvider` column, safe `localStorage` initialization |
| 4 | **Documentation foundation** (this PR) | — | README, SPEC, AGENTS, CLAUDE, docs/ (architecture, product requirements, methodology, API integrations, security, verification, roadmap, user guide, history), ADR-0001 to ADR-0003, `.gitignore`. No change to app behavior. |

## Key lessons learned

1. **Yahoo is not a simple free replacement in a browser-only app.** The keyless chart endpoint works from `curl` but sends no CORS headers, so browsers block it. The quote endpoint needs a session crumb. Yahoo also lacks fundamentals. It stays "Experimental / Browser test only" ([ADR-0002](decisions/ADR-0002-fmp-primary-provider.md)).
2. **FMP remains the main provider.** It is official, browser-friendly (CORS `*`) and covers the statements the strategies need. Plan restrictions are handled by marking data as missing.
3. **Static apps cannot hide keys.** The key is in the page, in `localStorage` and in request URLs. Only a backend or proxy can change that, and it is deliberately deferred ([ADR-0003](decisions/ADR-0003-no-backend-yet.md)).
4. **DCF is an educational estimate only.** It uses capped growth, has no net-debt adjustment, is sensitive to assumptions, and is kept out of the total score.
5. **Missing data must be visible.** Data Confidence and ⚪ "missing" tests were added because high scores can come from very few evaluable tests.
6. **API cost matters.** The cache, request preview, stop button and rate-limit halt made Deep Scans practical on limited plans.
