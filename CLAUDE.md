# CLAUDE.md

Instructions for **Claude Code** on Value Stock Finder.

[AGENTS.md](AGENTS.md) is the shared contract for all agents: workflow, constraints, secrets, scoring rules and verification. This file adds Claude-specific detail. If the two conflict, **AGENTS.md wins**. The repository owner's direct instructions override both.

## 1. Orient before changing anything

Run first:

```bash
pwd
git status
git branch --show-current
git fetch origin
git log --oneline --decorate -10
find . -maxdepth 3 -type f -not -path './.git/*' | sort
gh pr list --state all --limit 10
```

Then:

- If you're on `main` and it's clean: `git pull --ff-only origin main`, then create the feature branch.
- If there is uncommitted work you didn't create, **stop and ask**.
- Confirm `index.html`, `styles.css` and `js/` exist, and that the files you plan to change exist.

## 2. Files to read

| When | Read |
| --- | --- |
| Always | [AGENTS.md](AGENTS.md), [SPEC.md](SPEC.md) |
| Code changes | [docs/architecture.md](docs/architecture.md), the owning file in `js/` (see §3) |
| Scoring / DCF / relative changes | [docs/investment-methodology.md](docs/investment-methodology.md) |
| Provider / network changes | [docs/api-integrations.md](docs/api-integrations.md), [ADR-0002](docs/decisions/ADR-0002-fmp-primary-provider.md) |
| Anything touching keys or storage | [docs/security.md](docs/security.md), [ADR-0003](docs/decisions/ADR-0003-no-backend-yet.md) |
| Before opening a PR | [docs/verification.md](docs/verification.md) |

## 3. Navigating the code

The app is `index.html` (markup and IDs only), `styles.css`, and 12 classic scripts in `js/`, loaded with `defer` in the order below ([ADR-0004](docs/decisions/ADR-0004-split-static-assets.md)). All top-level functions and constants are global, so any file can call any other at runtime.

```bash
grep -nE "^(async )?function [A-Za-z]+" js/*.js        # function map, by file
grep -nE "^const (PRESET_LISTS|DEEP_ENDPOINTS|PROVIDERS|FMP_CACHE_PREFIX|YAHOO_)" js/constants.js js/cache.js
grep -n "<th>" index.html                                # table columns (36)
grep -n 'src="js/' index.html                            # script load order
```

| File (load order) | Owns |
| --- | --- |
| `js/constants.js` | `PRESET_LISTS`, `DEEP_ENDPOINTS`, `PROVIDERS`, cache TTLs, `DATA_CONFIDENCE_STRONG_MIN`, `RELATIVE_MIN_PEERS`, `DCF_MAX_GROWTH_RATE`, Yahoo messages, `TWO_STAGE_*` |
| `js/state.js` | `lastResults`, `allResults`, `currentFilter`, `stopRequested`, `lastScanStats` |
| `js/utils.js` | `escapeHtml`, `parseSymbols`, `sleep`, `numberOrNull`, `pick`/`pickNum`, `format*`, `mean`/`average`, `clamp`, `clampIntInput`, `parsePercentInput` |
| `js/cache.js` | `cacheKey`, `readCachedFmp`/`writeCachedFmp`, `readCachedYahoo`/`writeCachedYahoo`, `clearCache` |
| `js/providers.js` | `getSelectedProvider`, `providerLabel`, `endpointsForMode`, `fetchJson`, `callFmp`, `safeCall`, `fetchStockData`, `fetchYahooQuote`, `yahooChartToQuote`, `fetchQuoteData`, `fetchStockDataByProvider` |
| `js/metrics.js` | `buildMetrics`, `isUsListed`, `isTechOrPharma`, EPS growth helpers, `calcSloanRatio`, `computeDataConfidence`, `priceToOperatingCashFlow` |
| `js/dcf.js` | `computeDcfEstimate` and its FCF / growth helpers |
| `js/scoring.js` | `computeQuickScore`, `computeValueScores`, `computePiotroski`, `computeDreman`, `computeNeff`, `applyRelativeStrategies`, `recomputeTotalAndDecision`, `evaluateStock` |
| `js/render.js` | `setStatus`, `updateRequestPreview`, pills, `renderTable`, `renderDetails`, `setTableFilter`, `updateSummary`, `resetResults`, the row details dialog (`renderDetails` button, `openRowDetails`, `closeRowDetails`, `detailsDialogBodyHtml`) |
| `js/scan.js` | `estimateRequestPlan`, `estimateTwoStagePlan`, `readTwoStageSettings`, `scanStocks`, `requestStopScan`, `runTwoStageScan`, `rankStageOneCandidates`, `showTwoStageResults`, `testEndpoints`, `testSelectedProvider` |
| `js/export.js` | `EXPORT_HEADERS`, `buildExportRows` (shared by all formats), `exportCSV`, `exportXLSX`, `exportPDF`, `setExportStatus`, on-demand `loadVendorBundle` for `vendor/` |
| `js/app.js` | `initializePage`, `onProviderChange`, `loadPresetList`, `clearApiKey`, and the load-time call `initializePage()` |
| `js/shell.js` | App shell (ADR-0005): hash router for `#/setup` and `#/results`, element-hash anchors, focus/title, the global scan bar (mirrors `#status`, Stop proxy calling `requestStopScan()`), the results-ready cue. Self-initializing, loaded last. It only observes the DOM; it never touches scan, scoring, cache or rendering. |

Functions called from inline HTML handlers: `onProviderChange`, `loadPresetList`, `updateRequestPreview`, `scanStocks`, `requestStopScan`, `testEndpoints`, `testSelectedProvider`, `exportCSV`, `exportXLSX`, `exportPDF`, `clearCache`, `clearApiKey`, `setTableFilter`, `openRowDetails`, `closeRowDetails`, `onRowDetailsClosed`, `onRowDetailsBackdropClick`. Keep these names global. Do not name app globals `Table`, `Row`, `Column`, `Cell`, `autoTable` or `ExcelJS`: the export libraries define them.

Screens: `index.html` wraps the setup flow in `#shell-screen-setup` and the summary and table in `#shell-screen-results` (`data-screen`, toggled with `hidden`). Shell-owned elements use the `shell-` ID prefix. When moving markup between screens, keep every ID and handler exactly once.

## 4. Preserving existing behavior

- Make the smallest change that satisfies the request. Do not reformat or reorganize unrelated code.
- Match the existing style: classic scripts (no `import`/`export`), global functions, 2-space indentation, template-literal HTML, `escapeHtml` on dynamic values.
- Put new code in the file that owns the concern. Only `js/app.js` and `js/shell.js` (loaded last) may run code at load time. A new file needs a `<script src="js/….js" defer></script>` tag in the right order in `index.html`.
- When adding table columns, update `colspan="36"` everywhere (`js/render.js`, `js/scan.js`, `index.html`), the `<th>` list, `renderTable` and `exportCSV`. Add CSV columns **at the end**.
- Keep the FMP path intact when touching providers.
- Wrap new `localStorage` access in `try/catch`.

## 5. Ask before

- Changing architecture (splitting files, frameworks, build tools).
- Adding a backend, proxy, dependency or CDN script.
- Adding or replacing a data provider, or changing the default provider.
- Changing any scoring threshold, weight, decision rule or DCF formula.
- Removing any feature or column.
- Merging any PR.

## 6. Verification checklist

- [ ] `node --check` passes for every `js/*.js` file, and the script-order check passes (both in [AGENTS.md §8](AGENTS.md#8-verification-required-before-every-pr))
- [ ] `git diff --check` is clean
- [ ] Secret scan shows only labels
- [ ] No `package.json`, `node_modules` or backend files. Vendored export bundles match `vendor/README.md` (SHA-256).
- [ ] For code changes, the relevant items from [docs/verification.md](docs/verification.md) were checked in a browser (the in-app browser pane or a local server). Note that `file://` snapshots in preview panes may restrict `localStorage`.
- [ ] Docs updated for any behavior change
- [ ] PR opened against `main`, not merged

## 7. Response format

Follow [AGENTS.md §9](AGENTS.md#9-expected-final-response-format). Keep it factual. Report failed or skipped checks plainly. Give the commit SHA and PR URL.

## 8. Documentation style rules

- Primary language is English. Short Hebrew notes are fine where they help, for example to quote UI labels.
- Use Markdown tables for structured facts and Mermaid for flows.
- Mark every capability as **Current**, **Experimental**, **Planned**, **Future** or **Non-goal**.
- Never overstate: no "secure key storage", no "reliable free Yahoo API", no "finds good stocks".
- Every financial doc keeps the educational / not-investment-advice disclaimer.
- Quote thresholds from the code, and update the docs when the code changes.
- Use relative links between docs.

## 9. Known project history

| Step | Summary |
| --- | --- |
| `238d062` Initial website | Single-file screener with presets, FMP deep/quick scan, strategy scoring and CSV |
| PR #1 `647b759` | Local FMP cache, request preview, stop scan, rate-limit handling, EPS CAGR / Graham total EPS growth fix, Data Confidence, safer labels |
| PR #2 `339d5c7` | DCF assumptions, Estimated Fair Value, upside/discount/MoS columns, DCF Confidence, relative basis for Dreman/Neff, US vs non-US market-cap threshold |
| PR #3 `09dbd5d` | Data provider selector, FMP default, Yahoo Finance Experimental / Browser test only (quote-level, Deep Scan blocked), selected-provider test, CSV `dataProvider`, safe `localStorage` init |
| PR #4 `31dac23` | Documentation foundation (this set of docs) |
| PR #5 `da5f529` | MIT License |
| PR #6 `e553b59` | Two-stage scan (quote-only Stage 1, Deep Scan of the top N), expanded US presets, CSV stage columns, and Stage 1-only fallback rows labeled preliminary. Scoring unchanged. |
| PR #7 `dceef78` | Post-merge hardening: doc consistency and a zero-rows status message |
| PR #8 | Split into `index.html` + `styles.css` + `js/*.js` (ADR-0004). Code moved verbatim; no behavior, scoring, DCF or provider changes. |
| PR #9 `ccb5e3d` | UI polish, green finance identity, product mark, icons and illustrations (UI-only) |
| PR #10 `638d9dd` | App shell plan (ADR-0005), docs only |
| PR #11 `7b2b7e2` | App shell stage 1: Setup and Results screens, hash navigation, global scan bar (`js/shell.js`). No scan, scoring, DCF, provider, CSV or table changes. |
| PR #12 | Row details dialog (native `<dialog>`), real XLSX (ExcelJS) and PDF (jsPDF + AutoTable) exports from shared export rows; vendored on-demand libraries (ADR-0006). CSV byte-identical. No scoring, DCF, provider, scan or cache changes. |

Details are in [docs/HISTORY.md](docs/HISTORY.md).
