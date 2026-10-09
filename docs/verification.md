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

### App shell checks (since PR #11)

| Check | Expected |
| --- | --- |
| No hash, `#/setup`, unknown hash (`#/nope`, `#does-not-exist`) | Setup is the only visible screen. The **הגדרת סריקה** tab has `aria-current="page"`, and the title starts with "הגדרת סריקה ·". |
| `#/results` | Only Results is visible; the tab and title update |
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

- [ ] The settings appear as grouped sections: מקור נתונים, מניות לבדיקה, מצב סריקה, סינון בסיסי (collapsed), DCF assumptions (collapsed), then actions.
- [ ] Clicking a collapsed section title opens and closes it, and its inputs keep their values. Collapsed inputs still feed the scan (for example, change *מחיר מינימלי* while it is collapsed, then check the basic-filter results).
- [ ] The hero shows the badge, the title, the subtitle and the 4 feature chips. The workflow strip has 4 numbered links that scroll to `#sec-source`, `#sec-universe`, `#sec-scan` and `#sec-results`. The product mark sits beside the title. The feature chips and the main section titles show their small icons, and every `<use>` resolves to a symbol in the inline sprite. The margin-of-safety illustration shows on wide screens (over 900 px), with its 3 labels inside it, and is hidden on narrow screens. The results empty state shows its small magnifier-over-chart illustration.
- [ ] **סרוק מניות** is the only green filled button. (Since PR #11, **ייצא CSV** lives on the Results screen, and the Setup tools are בדיקות חיבור, Cache and מפתח API.) Stop is quiet until a scan runs. **נקה API Key שמור** is red. The connection tests and data tools sit in labeled groups.
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
