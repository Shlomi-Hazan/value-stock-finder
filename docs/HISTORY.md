# Project History

Last updated: 2026-10-08

## Timeline

| # | Change | Commit on `main` | Highlights |
| --- | --- | --- | --- |
| 0 | **Initial website** | `238d062` | Single-file value stock finder: Hebrew RTL UI, 4 US preset lists, FMP quote + deep endpoints, Momentum/Graham/Fisher/Cash/Buffett/Piotroski/Dreman/Neff scoring, results table, CSV export |
| 1 | **PR #1: Improve caching and scoring confidence** (merged 2026-08-30) | `647b759` | Local FMP cache (quotes 10 min, fundamentals 7 days), request preview, stop scan, rate-limit handling, EPS CAGR and Graham total EPS growth fix, Data Confidence, safer labels |
| 2 | **PR #2: Add DCF estimates and relative comparison basis** (merged 2026-08-30) | `339d5c7` | DCF assumption inputs, Estimated Fair Value, Fair Value / Current Price / Upside / Discount / Margin of Safety columns, DCF Confidence and details, explicit relative basis (industry → sector → scanned list) for Dreman/Neff, US vs non-US market-cap threshold |
| 3 | **PR #3: Add data provider abstraction and Yahoo experimental quotes** (merged 2026-10-08) | `09dbd5d` | Data Provider selector, FMP stays full/default, Yahoo Finance Experimental / Browser test only (quote-level mapping, Deep Scan blocked, CORS warnings), selected-provider test button, CSV `dataProvider` column, safe `localStorage` initialization |
| 4 | **PR #4: Documentation foundation** (merged 2026-10-08) | `31dac23` | README, SPEC, AGENTS, CLAUDE, docs/ (architecture, product requirements, methodology, API integrations, security, verification, roadmap, user guide, history), ADR-0001 to ADR-0003, `.gitignore`. No change to app behavior. |
| 5 | **PR #5: Add MIT License** (merged 2026-10-08) | `da5f529` | `LICENSE` (MIT) and a README license section |
| 6 | **PR #6: Two-stage scan and larger universe controls** (merged 2026-10-08) | `e553b59` | Two-stage scan mode (quote-only Stage 1 up to 200 symbols, FMP Deep Scan of the top N ≤ 30), Stage 1 max / Top N settings, per-stage request preview and confirmation, stage status and summary, stop and rate-limit handling per stage, CSV `scanMode`/`scanStage`/`stage1Rank`, expanded US presets (90 / 95 / 60). Yahoo is blocked for Two-stage. **Scoring rules unchanged.** Follow-up: clarified that Stage 1-only fallback rows are preliminary quote-level output (the preliminary `evaluateStock()` score, not final value scores) in the status, details, pill and summary; shortened the UI label to "Two-stage — Quick then Deep". |
| 7 | **PR #7: Harden two-stage scan after merge** (merged 2026-10-08) | `dceef78` | Doc consistency fixes (UI label, display-limit note, history SHAs) and a clearer status when a rate limit hits the very first Stage 1 call. No scoring changes. |
| 8 | **PR #8: Split app into static files** (merged 2026-10-08) | `389f48b` | `index.html` reduced to markup; CSS moved to `styles.css`; JavaScript moved verbatim into 12 classic scripts in `js/`, loaded with `defer` in a fixed order ([ADR-0004](decisions/ADR-0004-split-static-assets.md) supersedes ADR-0001). **No behavior, UI, scoring, DCF, provider or CSV changes.** No build step, dependencies or backend. |
| 9 | **PR #9: Polish settings layout and visual hierarchy** (merged 2026-10-08) | `ccb5e3d` | UI-only polish in `index.html` and `styles.css`: settings grouped into sections (data source, stocks, scan mode, collapsible basic filters and DCF, actions); helper microcopy; a green primary Scan button with quieter grouped secondary actions and a red destructive action; system-font, Apple-inspired calm styling; segmented-control result tabs; cleaner summary tiles; empty-state table message now visible. Two follow-up visual passes are listed under [PR #9 visual passes](#pr-9-visual-passes). **No JS, scoring, DCF, provider, scan, cache, table or CSV changes.** |
| 10 | **PR #10: App shell / multi-screen navigation planning** (merged 2026-10-09) | `638d9dd` | **Docs-only planning PR.** Adds [ADR-0005](decisions/ADR-0005-app-shell-navigation-plan.md) (Proposed): a static app shell with hash-routed Setup, Results, Methodology and Settings & tools screens, a global scan bar, and a staged rollout over PRs #11–#14. Updates the architecture, roadmap and README. **No code changes, no behavior changes:** `index.html`, `styles.css` and `js/` are untouched. |
| 11 | **PR #11: App shell navigation for Setup and Results** | — | Stage 1 of ADR-0005. New `js/shell.js` (loaded last): hash routes `#/setup` and `#/results`, `#sec-*` anchors resolved to their screen, Back/Forward, focus and title handling. A sticky segmented nav and a global scan bar that mirrors `#status`, offers Stop through `requestStopScan()` and shows a results-ready cue with no auto-navigation. Compact header on Results; Export CSV moved to Results. **No changes to the 12 existing scripts. No scan, scoring, DCF, provider, cache, CSV, table or `localStorage` changes.** |
| 12 | **Fix: false FMP rate-limit detection** | — | `fetchJson()` stringified every successful response and matched `"429"`, so valid data such as `forwardPriceToEarningsGrowthRatioTTM: 4.4444542…` on AAPL `/stable/ratios-ttm` stopped Deep Scan with the rate-limit message. Now only HTTP status 429 or an explicit error field (`Error Message`, `error`, `message`) counts. `clearCache()` collects keys before removing them, and malformed cache entries are ignored and removed. No scoring, DCF, export or endpoint changes. |

### PR #9 visual passes

Second pass (visual identity):

- indigo/violet palette on a lavender canvas
- hero with badge, feature chips and a labeled margin-of-safety concept illustration
- numbered workflow strip (in-page anchors) and matching section numbers
- accent rails on the main panels
- action dock with an inset preview/status card
- green-only "strong candidates" tile
- table scroll-edge shadows and a styled empty state
- all text meets WCAG AA contrast

Third pass (green finance identity):

- the deep money-green accent `#0b6b4c` replaces indigo, with a banker's-gold fair-value line
- an original inline-SVG product mark (fair value vs price wedge) and a matching data-URI favicon
- an inline icon sprite for the feature chips and section titles
- a refined margin-of-safety illustration (grid, bracket, value dot, caption)
- a results empty-state illustration
- a faint graph-paper hero texture

## Key lessons learned

1. **Yahoo is not a simple free replacement in a browser-only app.** The keyless chart endpoint works from `curl` but sends no CORS headers, so browsers block it. The quote endpoint needs a session crumb. Yahoo also lacks fundamentals. It stays "Experimental / Browser test only" ([ADR-0002](decisions/ADR-0002-fmp-primary-provider.md)).
2. **FMP remains the main provider.** It is official, browser-friendly (CORS `*`) and covers the statements the strategies need. Plan restrictions are handled by marking data as missing.
3. **Static apps cannot hide keys.** The key is in the page, in `localStorage` and in request URLs. Only a backend or proxy can change that, and it is deliberately deferred ([ADR-0003](decisions/ADR-0003-no-backend-yet.md)).
4. **DCF is an educational estimate only.** It uses capped growth, has no net-debt adjustment, is sensitive to assumptions, and is kept out of the total score.
5. **Missing data must be visible.** Data Confidence and ⚪ "missing" tests were added because high scores can come from very few evaluable tests.
6. **API cost matters.** The cache, request preview, stop button and rate-limit halt made Deep Scans practical on limited plans. Two-stage scan (PR #6) goes further by deep-scanning only the top N candidates.
7. **Cheap filters carry bias.** Stage 1 can only use quote data, so its ordering leans toward momentum. It is documented as candidate ordering, not a value methodology.
8. **Structure follows size.** At about 2,400 lines the single file became hard to review. Splitting it into static files, without a build step, kept the zero-setup benefit (ADR-0004).
