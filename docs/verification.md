# Verification

Last updated: 2026-10-08

Run this before every PR. **Documentation-only PRs** need sections 1–3 and must confirm the app files (`index.html`, `styles.css`, `js/`) are unchanged. **Code PRs** need everything.

There is no automated test suite or CI yet; that is planned (see [roadmap.md](roadmap.md)).

## 1. Static checks (required)

### 1.1 JavaScript syntax and script-order check

```bash
find js -name '*.js' -print0 | xargs -0 -n1 node --check && echo "all js files ok"
python3 - <<'PY'
# Every js/*.js file is referenced exactly once by index.html, as a deferred classic script, in the expected order.
import re
from pathlib import Path
EXPECTED = ["constants", "state", "utils", "cache", "providers", "metrics", "dcf", "scoring", "render", "scan", "export", "app", "shell"]
html = Path("index.html").read_text(encoding="utf-8")
refs = re.findall(r'<script src="js/([a-z]+)\.js" defer></script>', html)
on_disk = sorted(p.stem for p in Path("js").glob("*.js"))
assert refs == EXPECTED, refs
assert sorted(refs) == on_disk, (refs, on_disk)
assert html.count('<link rel="stylesheet" href="styles.css" />') == 1
assert "<script>" not in html and "<style>" not in html
print("script order ok")
PY
```

Expected output: `all js files ok` and `script order ok`. The app has no inline `<script>`; all code lives in `js/` ([ADR-0004](decisions/ADR-0004-split-static-assets.md)).

### 1.2 Whitespace / conflict-marker check

```bash
git diff --check
```

Expected: no output. The vendored bundles in `vendor/` are exempt (`.gitattributes`), because they are committed byte-for-byte from upstream.

### 1.3 API key / secret scan

```bash
grep -RInE "sk-|AIza|secret|token|api[_-]?key|apikey|BEGIN PRIVATE KEY|password" --exclude-dir=.git .
```

Hits on labels and variable names (`apiKey`, "API Key", `type="password"`, documentation text) are expected. Inside `vendor/` (third-party code), the library identifiers `password` (jsPDF form fields), `token` (ExcelJS tokenizer) and `secret` (elliptic-curve crypto code bundled inside ExcelJS) are expected too. **Any real key value fails the check.** As an extra check, look for long key-like strings:

```bash
grep -Eon "[A-Za-z0-9]{32,}" index.html styles.css js/*.js
```

The only expected hits are long FMP field names such as `netCashProvidedByOperatingActivities`.

### 1.4 No dependencies or backend

```bash
ls package.json node_modules vite.config.* next.config.* server.* 2>/dev/null || echo "none"
grep -nE "<script src=\"https?:|<link [^>]*href=\"https?:" index.html || echo "no external scripts/styles (only local styles.css and js/)"
shasum -a 256 vendor/*/*.min.js   # must match the SHA-256 column in vendor/README.md (ADR-0006)
grep -n "vendor/" index.html || echo "vendor libraries are not loaded at page start (on demand only)"
```

### 1.5 Docs-only PRs

```bash
git diff --name-only origin/main...HEAD
```

`index.html`, `styles.css` and `js/` must not be listed.

## 2. Local server smoke test

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/> and confirm:

- [ ] The page loads with no console errors (no `ReferenceError`, no `SyntaxError`).
- [ ] The server log or the network panel shows HTTP 200 for `styles.css` and all 13 `js/*.js` files, with no 404s except the browser's automatic `favicon.ico` request.
- [ ] The page is styled (the light green hero with a faint grid, the green product mark and the green scan button), which confirms `styles.css` loaded. The browser tab shows the green product-mark favicon (an inline SVG data URI). Some browsers still probe `/favicon.ico` and log a harmless 404; the project has no such file on purpose.
- [ ] Every inline handler resolves to a defined global function. In the console: `[...document.querySelectorAll('[onclick],[onchange],[oninput]')].flatMap(e => ['onclick','onchange','oninput'].map(a => e.getAttribute(a)).filter(Boolean)).map(h => h.match(/^(\w+)\(/)[1]).filter(f => typeof window[f] !== 'function')` returns `[]`.
- [ ] **Data Provider** defaults to **Financial Modeling Prep**.
- [ ] The preset list fills the symbol textarea.
- [ ] The request preview shows "Financial Modeling Prep — Deep Scan: …".

> Embedded preview panes that load the file as a `data:` or `file://` snapshot may restrict `localStorage`. The app should still load, because access is wrapped in `try/catch`.

### Rate-limit detection checks (since the false-429 fix)

Mock `window.fetch` in the console and call `safeCall(path, "AAPL", "k", {})`:

| Mock response | Expected |
| --- | --- |
| HTTP 200, valid ratios JSON containing `4.444454298150962` or the text `429` | `ok: true`, `rateLimited: false` |
| HTTP 429 (any body) | `ok: false`, `rateLimited: true` |
| HTTP 200, `{"Error Message": "Rate limit reached"}` | `rateLimited: true` |
| HTTP 200 or 403, `{"Error Message": "Restricted Endpoint: …"}` | `rateLimited: false`, ordinary endpoint error |
| HTTP 500 | `rateLimited: false`, `HTTP 500` |

Cache: with 40+ FMP and Yahoo entries, `clearCache()` leaves no `valueStockFinder…Cache:` key and keeps unrelated keys. A cache entry with bad JSON, a non-numeric `timestamp` or no `data` is ignored by `readCachedFmp`/`readCachedYahoo` and removed.

### Percent formatter checks

In the console, `formatPercentValue(v, assumeDecimal)` returns HTML; strip tags to compare:

| Call | Expected text |
| --- | --- |
| `(0.12, true)` / `(-0.25, true)` | `+12.00%` / `-25.00%` |
| `(1.01, true)` / `(-1.01, true)` | `+101.00%` / `-101.00%` |
| `(12, false)` / `(-25, false)` | `+12.00%` / `-25.00%` |
| `(null)`, `(undefined)`, `("abc")` | `-` |

### Results search and sort checks (since PR #17)

Run a Deep Scan on three symbols (mocked data is fine), then on Results:

| Check | Expected |
| --- | --- |
| Search by symbol (`#resultsSearch` = `msf`) and by company (`coca`) | Only matching rows; the note reads "מציג N מתוך M תוצאות"; a search with no match shows "אין תוצאות התואמות לחיפוש" |
| Clear the search | The tab's normal rows return and the note disappears |
| Search together with a tab | The search applies inside the active tab only |
| Each sort option | Orders the displayed rows (numbers high to low, symbol A–Z, missing values last); "ברירת מחדל" returns the rank order |
| `lastResults` order after searching and sorting | Unchanged (same array order as before) |
| **פתח פירוט** after search and sort | Opens the row on screen |
| CSV / XLSX / PDF after search and sort | Same rows as without a search (all stored results) |
| 375 / 752 px | No page overflow; the search box and the sort select fit, and the select is full width on phones |

### Results empty states and notes (since PR #18)

| Check | Expected |
| --- | --- |
| Results before any scan | The table row says "עדיין לא בוצעה סריקה" with a link to `#/setup` |
| **איך לקרוא את התוצאות?** (`#resultsGuide`) | Collapsed by default; opens to 7 short points and a link to `#/methodology`; no overflow at 375 px |
| Active tab with no rows | Message names the tab and offers **הצג את הכול** (sets the tab to All) |
| Search with no match | Message quotes the (escaped) term and the tab, offers **נקה חיפוש**, and counts matches in other tabs when there are any |
| Empty `lastResults` after `renderTable()` | "אין תוצאות להצגה" with a link to Setup |
| All rows rejected (for example minimum price 1000) | `#resultsStateNote` explains the basic filter |
| Stage 1-only rows (`lastScanStats.twoStage.preliminaryOnly`) | `#resultsStateNote` says the rows are Preliminary |
| Search, sort, details, exports, routes | Unchanged from the PR #17 checks |

Messages written by `js/scan.js` for scans that return nothing (rate limit before any row, Yahoo blocked, an error) are unchanged.

### Settings & Tools checks (since PR #16)

| Check | Expected |
| --- | --- |
| `#/settings`, `#settings-provider`, `-checks`, `-cache`, `-preview`, `-data` | Only Settings is visible; the **הגדרות וכלים** tab is current; the title starts with "הגדרות וכלים ·"; an anchor focuses its heading below the sticky bar. `#sec-source` also opens Settings. |
| IDs | `dataProvider`, `apiKey`, `endpointStatus` are inside `#shell-screen-settings`; `requestPreview`, `status`, `scanButton`, `stopButton` are inside Setup; no duplicate IDs |
| Setup summary | Shows the provider and "הוזן" / "חסר" for the key, and updates when the provider or the key changes (and after **נקה API Key שמור**). The link opens `#settings-provider`. |
| Tests on Settings | **בדוק endpoints** and **בדוק ספק נבחר** fill `#endpointStatus` and the status mirror; with no key the mirror shows "חסר API Key" |
| Cache and key tools on Settings | **נקה Cache** removes every cache key; **נקה API Key שמור** empties the field and the saved key |
| Mirrors | `#shell-settings-preview` equals `#requestPreview`; `#shell-settings-status` equals `#status`, including its colour class |
| Scan bar | Starting a scan, then opening Settings, shows the scan bar with Stop |
| 375 / 752 px | No page overflow on any of the four screens; the four tabs fit on one row (≥ 44 px high) |

### App shell checks (since PR #11)

| Check | Expected |
| --- | --- |
| No hash, `#/setup`, unknown hash (`#/nope`, `#does-not-exist`) | Setup is the only visible screen. The **הגדרת סריקה** tab has `aria-current="page"`, and the title starts with "הגדרת סריקה ·". |
| `#/results` | Only Results is visible; the tab and title update |
| `#/methodology`, `#methodology-dcf`, `#methodology-limitations` | Only Methodology is visible; the **מתודולוגיה** tab is current, the title starts with "מתודולוגיה ·", and a section anchor focuses its heading below the sticky bar. No page overflow at 375 px, and the three tabs fit on one row. Its rules still match [investment-methodology.md](investment-methodology.md). |
| `#sec-source`, `#sec-universe`, `#sec-scan` | Setup opens and the section scrolls into view **below** the sticky bar, with focus on its title |
| `#sec-results` | Results opens, scrolled to the summary |
| Back / Forward | Moves between the previous screens |
| Keyboard | Tab reaches both nav tabs. Enter switches screens. Focus moves to the new screen's heading. |
| Scan from Setup, then switch to Results | The global scan bar shows a spinner, mirrors `#status` exactly, and has **עצור סריקה** (stop scan) |
| Global Stop | Halts the scan exactly like `#stopButton` (stops before the next symbol) |
| Scan finishes while on Setup | **No auto-navigation.** The bar keeps the final status, with "צפה בתוצאות" (view results) and a ✕ to dismiss. A green dot appears on the **תוצאות** tab. |
| Visiting Results | Clears the dot. The "no results yet" hint shows only before any result rows exist. |
| Export CSV | The button is on the Results screen and downloads the same 44-column CSV |
| `localStorage` | Same keys before and after navigating and scanning. The shell adds none. |
| 1280 / 424 / 375 px | No page overflow. The nav tabs are ≥ 40 px tall (44 px on phones). The sticky bar never hides a scrolled-to section. The table scrolls only inside its wrapper. |

### UI layout checks (since PR #9)

- [ ] The Setup screen shows the provider summary line, then grouped sections: מניות לבדיקה, מצב סריקה, סינון בסיסי (collapsed), DCF assumptions (collapsed), then actions.
- [ ] Clicking a collapsed section title opens and closes it, and its inputs keep their values. Collapsed inputs still feed the scan (for example, change *מחיר מינימלי* while it is collapsed, then check the basic-filter results).
- [ ] The hero shows the badge, the title, the subtitle and the 4 feature chips. The workflow strip has 4 numbered links that scroll to `#sec-source`, `#sec-universe`, `#sec-scan` and `#sec-results`. The product mark sits beside the title. The feature chips and the main section titles show their small icons, and every `<use>` resolves to a symbol in the inline sprite. The margin-of-safety illustration shows on wide screens (over 900 px), with its 3 labels inside it, and is hidden on narrow screens. The results empty state shows its small magnifier-over-chart illustration.
- [ ] **סרוק מניות** is the only green filled button. (Since PR #11, **ייצא CSV** lives on the Results screen. Since PR #16, the connection tests, Cache and the API key tools live on the Settings & Tools screen.) Stop is quiet until a scan runs. **נקה API Key שמור** is red. On Settings & Tools, the connection tests and cache tool sit in labeled groups.
- [ ] Helper texts appear under the API key, the preset list, the symbols field and *כמות להצגה*, and as footers under the data-source, scan-mode, basic-filter, DCF and action sections.
- [ ] Before any scan, the empty table message ("עדיין לא בוצעה סריקה") is visible without scrolling the table. A soft shadow on the table's edge shows when more columns are off-screen.
- [ ] Color contrast: body, muted, button, pill and status text all meet WCAG AA (4.5:1) against their backgrounds.
- [ ] At 1280, 424 and 375 px: no horizontal page overflow; sections stack; buttons wrap; no clipped labels; the table scrolls only inside its wrapper.
- [ ] Keyboard: Tab reaches every control, and focus rings are visible on inputs, buttons and section titles.

## 3. Behavior checklist

### FMP

| Check | Expected |
| --- | --- |
| Scan with an empty API key | Status "חסר API Key". No network requests. |
| Endpoint test (**בדוק endpoints על AAPL**) with a valid key | A pill per endpoint: "עובד" / source, or "חסום/שגיאה" for restricted endpoints |
| Endpoint test with no key | "חסר API Key" |
| Deep Scan with more than 10 symbols | A confirmation dialog shows the request estimate. Cancel means no requests. |
| Small Deep Scan (e.g. `AAPL, MSFT, KO`) | Table rows appear with strategy, DCF and confidence columns filled where the data exists |
| Repeat the same scan | The preview and status show cache hits. The Data Source column shows Cache. |
| Stop during a scan | The scan halts before the next symbol. Partial results appear with a stop note. |
| Rate limit (if encountered) | Warning status, partial results, no further calls |

### Yahoo Experimental

| Check | Expected |
| --- | --- |
| Select Yahoo | An orange warning appears containing "Experimental / Browser test only" and "likely to be blocked by browser/CORS" |
| Preview with Yahoo | Contains "Browser/CORS may block these requests. This is not a reliable replacement for FMP." |
| Yahoo + Deep Scan, then click scan | Warning "Yahoo Experimental currently supports quote-level scan only…". **Zero network requests.** |
| Yahoo + Momentum scan | Usually: one failed request, then the scan stops with "Yahoo quote request failed. This may be blocked by browser/CORS or Yahoo restrictions." |
| **בדוק ספק נבחר (AAPL)** with Yahoo | Exactly one request. A success or failure pill. |
| Switch back to FMP | The warning hides. The FMP preview returns. |

### Two-stage scan

| Check | Expected |
| --- | --- |
| Scan mode list | Contains "Two-stage — Quick then Deep", fully visible (not clipped) in the select. The preview still starts with "Two-stage scan — Quick filter first, then Deep Scan top candidates". |
| Settings | *Stage 1 max symbols* (50) and *Deep Scan Top N* (10) are visible. Out-of-range values are clamped (1–200 / 1–30) and written back when a scan starts. |
| Preview (FMP) | Lines for Stage 1 quote calls (with cache), Stage 2 = candidates × 9, the estimated max before cache, a note for symbols beyond the max, and the warning text |
| Yahoo + Two-stage | Preview and status say "…does not support Two-stage scan because Stage 2 requires FMP Deep Scan." **Zero network requests.** |
| No API key | "חסר API Key" (missing API key), no requests |
| Run (e.g. 6 symbols, Top N 3) | Stage 1 makes exactly one quote call per symbol, up to the max, and no deep calls. Stage 2 makes 9 calls per candidate, with the quote from cache. The table shows only the deep rows, marked **Two-stage: Deep**. |
| Basic filter | Symbols failing price/volume/market cap are never deep-scanned |
| Stop in Stage 1 | No deep calls. Preliminary rows marked **Stage 1 בלבד (quote)**, with a clear status. |
| Stage 1-only fallback labeling (stop in Stage 1, Stage 2 skipped, rate limit before any deep row) | The status says the rows are Preliminary (quote-level), not final Deep Scan / value-score results, and that full scoring requires Stage 2. Row details say "Two-stage scan — Preliminary (quote-level)". The pill shows "Preliminary". The summary line warns that only preliminary Stage 1 rows are shown. |
| Stop in Stage 2 | Stops before the next candidate. Partial deep rows are shown. |
| Rate limit in either stage | Halts on the failing call with no further requests. Partial rows are shown with a stage-specific status. |
| Summary line | Stage 1 checked, candidates selected, Stage 2 deep-scanned, API, Cache |
| Large run | Confirmation when the estimate exceeds 100 calls |
| Top N vs display limit | With Top N greater than **כמות להצגה** (how many to show), the table shows at most the display limit. The Stage 2 count in the summary line still reflects every deep-scanned candidate. |
| Rate limit on the first Stage 1 call | The status says no Stage 1 rows were collected; it does not say "showing 0 rows". |

### Results, DCF and export

| Check | Expected |
| --- | --- |
| Table headers | 36 columns, including Fair Value, Current Price, Upside, Discount, Margin of Safety, DCF Confidence, Data Confidence, Relative Basis |
| Momentum-only results | DCF cells show "חסר נתון". DCF Confidence shows "Not enough data". |
| Row details | **פתח פירוט** (open details) opens `#detailsDialog`; table rows keep their normal height. The dialog shows the sections Summary, DCF, Data Confidence, Strategy checks (7 cards) and Sources/limitations. It scrolls internally. Escape, ✕, **סגור** (close) and a backdrop click close it, and focus returns to the opening button. It works from filtered tabs, and is full-screen on phones. Opening it does not shift the page sideways. |
| Tabs | All / Strong / Watchlist / Rejected filter correctly |
| **ייצא CSV** | Downloads `value_stock_finder_results.csv` with 44 columns, ending with `dataProvider, scanMode, scanStage, stage1Rank` |
| **ייצא XLSX** | Downloads `value-stock-finder-results-YYYY-MM-DD.xlsx` (it starts with `PK`). It opens in Excel, Numbers or openpyxl. Sheets: Summary, Results, Notes. Results has 44 headers equal to the CSV header, and every cell equals the CSV value. The header is frozen and filtered, and number formats apply. Summary counts match the screen. |
| **ייצא PDF** | Downloads `value-stock-finder-results-YYYY-MM-DD.pdf` (it starts with `%PDF-`). It opens in a PDF viewer. It has the title, run info, counts and disclaimer, and an 11-column table. Over about 23 rows it continues onto more pages, with the header repeated and a "Page N" footer. Decisions are in English, and no Hebrew mojibake appears. |
| Export libraries | Load only on the first XLSX or PDF click (network or server log). No console errors. No CDN requests. |
| CSV with no results | Status "אין תוצאות לייצוא" |
| **נקה Cache** | Status "נמחקו N פריטי Cache". The next preview shows 0 cached. |
| **נקה API Key שמור** | The field clears. It stays empty after reload. |

## 4. Regression checklist before every PR

- [ ] Static checks 1.1–1.4 pass (every `js/*.js` file passes `node --check`, and the script order is correct)
- [ ] All assets load (no 404s), and all inline-handler functions are defined (see §2)
- [ ] FMP is still the default provider
- [ ] FMP Deep Scan still requests quote + 9 endpoints
- [ ] Request preview, stop scan and rate-limit handling still work
- [ ] DCF settings and the 6 DCF-related columns are present
- [ ] Relative Basis column and Dreman/Neff scores are present
- [ ] Data Confidence column is present. Strong Candidate still requires ≥ 70% confidence.
- [ ] CSV export still works. Column order is unchanged, or the change is documented.
- [ ] Endpoint test and selected-provider test still work
- [ ] Preset lists and manual symbols still work
- [ ] Yahoo stays labeled experimental, and Deep Scan and Two-stage stay blocked for it
- [ ] Two-stage: Stage 1 makes no deep calls, and Stage 2 is limited to Top N
- [ ] Deep Scan and Momentum / Market make the same calls as before (10 and 1 per symbol)
- [ ] Any scoring change is listed in the PR and in [investment-methodology.md](investment-methodology.md)
- [ ] No secrets, dependencies or backend added
