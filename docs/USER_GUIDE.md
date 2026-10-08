# User Guide

Last updated: 2026-10-08

> ⚠️ Value Stock Finder is an **educational tool, not investment advice**. It applies simplified checklists to third-party data that may be incomplete or wrong.

The app's interface is in Hebrew. This guide gives each Hebrew label with its English meaning.

---

## 1. Open the app

- **Simplest:** double-click `index.html` to open it in Chrome, Edge, Firefox or Safari. Keep `styles.css` and the `js/` folder next to it, because the page loads them.
- **Recommended:** from the project folder, run:

  ```bash
  python3 -m http.server 8000
  ```

  Then open <http://localhost:8000/>.

### How the settings page is organized

At the top, a short strip shows the workflow: **1 מקור נתונים → 2 מניות → 3 סריקה → 4 תוצאות** (data source → stocks → scan → results). Each step is a link that scrolls to that part of the page; it is not separate navigation. The same numbers appear next to the section titles below. The small illustration next to the title (on wide screens) explains the margin-of-safety idea: the gap between the estimated fair value and the price. It is an illustration, not data.

The settings are grouped top to bottom in the order you use them:

| Section | Contains |
| --- | --- |
| **מקור נתונים** (data source) | Data Provider, API Key (FMP), and the Yahoo warning when Yahoo is selected |
| **מניות לבדיקה** (stocks to check) | Preset list and the symbols textarea |
| **מצב סריקה** (scan mode) | Scan mode, **כמות להצגה** (how many to show), and the two Two-stage settings |
| **סינון בסיסי** (basic filters) | Minimum market cap (US / outside the US), minimum volume, minimum price. **Collapsed by default**: click the title to open it. |
| **הנחות Estimated Fair Value / DCF Estimate** | Discount rate, terminal growth, projection years, margin of safety. **Collapsed by default.** |
| Actions | **סרוק מניות** (scan stocks, the indigo primary button) and **עצור סריקה** (stop scan), then the request preview and status in a small card right below them. Below them, three quieter groups: **בדיקות חיבור** (connection tests), **תוצאות ונתונים** (results and data: CSV export, clear cache) and **מפתח API** (API key: clear the saved key, shown in red). |

Collapsed sections keep their values. They are still used in every scan, even while closed.

## 2. Enter your FMP API key

1. Get a key from Financial Modeling Prep.
2. Paste it into **API Key (FMP)**.
3. It is saved in your browser after your first scan or test, and refilled automatically next time.

> Your key is stored unencrypted in this browser and is sent in request URLs. Use it only on your own computer. See [security.md](security.md).

## 3. Choose the data provider

| Option | Use it for |
| --- | --- |
| **Financial Modeling Prep** (default) | All real scans: Deep Scan, strategies, DCF |
| **Yahoo Finance Experimental / Browser test only** | Only a connectivity experiment. Requests are **likely to be blocked by your browser (CORS)**. Quote-level data only, with no market cap, fundamentals or DCF. **Not a replacement for FMP.** |

An orange warning box appears whenever Yahoo is selected.

## 4. Enter symbols

- **רשימה מוכנה** (preset list): pick one of
  - **ארה״ב - חברות גדולות** (US large caps)
  - **Value Candidates**
  - **טכנולוגיה** (technology)
  - **דיבידנד/יציבות** (dividend / stability)

  Each of these has 30 US symbols. There are also three larger, curated lists, meant for Two-stage scan:
  - **ארה״ב - חברות גדולות מורחב (90)** (US large caps, expanded)
  - **ארה״ב - Value מורחב (95)** (US value, expanded)
  - **ארה״ב - דיבידנד מורחב (60)** (US dividend, expanded)
- **ידני - לא לשנות את הרשימה** (manual, keep my list): type your own symbols in **רשימת מניות לבדיקה** (list of stocks to check), separated by commas, spaces or new lines. Example: `AAPL, MSFT, KO, JNJ`. Use FMP-style symbols such as `BRK-B`.

## 5. Choose the scan mode

| Mode | Cost | Result |
| --- | --- | --- |
| **Value Scan מלא ככל האפשר** (full value scan, default) | 10 API calls per symbol | All strategies, Piotroski, relative checks, DCF |
| **Momentum / Market בלבד** (momentum / market only) | 1 API call per symbol | Momentum score only. The other columns show "חסר" (missing). |
| **Two-stage — Quick then Deep** | Stage 1: 1 call per symbol. Stage 2: 9 calls per selected candidate. | Full results for the top candidates only |

The line under the buttons previews the cost, including how many responses will come from the cache. A Deep Scan of more than 10 symbols asks you to confirm first, as does a Two-stage scan estimated at more than 100 calls.

### Using Two-stage scan (FMP only)

1. Pick a larger list, such as an expanded preset, or paste your own.
2. Choose **Two-stage — Quick then Deep** in the scan-mode list. The request preview spells it out as "Two-stage scan — Quick filter first, then Deep Scan top candidates".
3. Set **Two-stage: Stage 1 max symbols** (default 50, 1–200). Only the first that many symbols in the list are checked.
4. Set **Two-stage: Deep Scan Top N** (default 10, 1–30). This is how many candidates get the full Deep Scan. The table still shows at most **כמות להצגה** (how many to show) rows, so if Top N is larger, raise that setting too to see every deep-scanned candidate.
5. Check the preview: Stage 1 quote calls, Stage 2 maximum (Top N × 9), and the total before cache.
6. Scan. The status shows `Stage 1 … X/Y`, then `Stage 2 … X/Y`.

How candidates are picked: only stocks that pass the basic filter (price, volume, market cap) qualify. They are then ordered by the existing total and Momentum / Market scores. This ordering favors large, liquid, rising stocks. It is **not** a value judgement, and it can skip cheap stocks that are falling. Raise Top N if you want a wider net.

The final table shows the deep-scanned candidates, with all columns. A line under the summary boxes reports Stage 1 checked, candidates selected, Stage 2 deep-scanned, API calls and cache hits. If you stop during Stage 1, or nothing passes the basic filter, you'll see preliminary rows marked **Stage 1 בלבד (quote)** (Stage 1 only). These rows have no fundamentals and no DCF.

Two-stage scan is blocked when Yahoo is selected.

Other settings:

- **כמות להצגה** (how many to show), in the scan-mode section: top-N rows, default 15.
- In the collapsed **סינון בסיסי** (basic filters) section:
  - **שווי שוק מינימלי בארה״ב / מחוץ לארה״ב** (minimum market cap, US / outside the US): default 2B / 1B.
  - **Volume מינימלי** (minimum volume): default 100,000.
  - **מחיר מינימלי** (minimum price): default 5.
- DCF assumptions, in their own collapsed section: see §8.

Click **סרוק מניות** (scan stocks). Click **עצור סריקה** (stop scan) to stop before the next symbol.

## 6. Understand the results

**Summary boxes:**

- **נבדקו** (checked)
- **עברו סינון בסיסי** (passed the basic filter)
- **מועמדות חזקות** (strong candidates)
- **ציון ממוצע** (average score)
- **המובילה** (top stock)

**Tabs:**

- **הכול** (all)
- **מועמדות חזקות** (strong candidates)
- **Watchlist**
- **נפסלו** (rejected)

**Key columns:**

| Column | Meaning |
| --- | --- |
| דירוג / סימול / חברה / סקטור | Rank / symbol / company / sector |
| מחיר, שינוי, Market Cap | Price, daily change, market cap |
| P/E, P/S, P/B, ROE, ROA, Debt/Equity, Current Ratio, FCF | Raw metrics. "-" means not available. |
| דיבידנד | Dividend: "כן" (yes) with amount/yield, or "לא / חסר" (no / missing) |
| Strategy columns | % of the available tests passed. Green ≥ 75, amber ≥ 50, red below. "חסר" means no data. |
| Piotroski Approx. | Score out of 9 |
| Relative Basis | Which peers Dreman/Neff were compared against, and how many |
| Fair Value … DCF Confidence | DCF outputs (§8) |
| Data Confidence | % of 19 key metrics available |
| מקור נתונים | Data source: API calls vs cache. Yahoo rows carry a Yahoo badge. Two-stage rows show **Two-stage: Deep** with their Stage 1 rank, or **Stage 1 בלבד (quote)** (Stage 1 only). |
| ציון כולל | Total score |
| החלטה | Decision: מועמדת חזקה (strong) / Watchlist / בדיקה ידנית (manual review) / נפסלה (rejected) |
| פירוט | Details: click **פתח פירוט** (open details) for every test, as ✅ pass, ❌ fail or ⚪ missing |

## 7. Interpret the strategy columns

- Each column is a **checklist inspired by** an investor or approach. It is not their real method.
- A percentage counts **only the tests that had data**. Check Data Confidence and the details before trusting a high score.
- **Dreman** and **Neff** compare the stock **only with the other stocks in your scan**. A small or mixed list gives weak comparisons. The Relative Basis column shows the peer group.
- "Strong Candidate" means "passed many mechanical checks with enough data". It does **not** mean "buy".

Exact rules: [investment-methodology.md](investment-methodology.md).

## 8. Interpret DCF / Fair Value

Assumptions you can set:

| Setting | Default |
| --- | --- |
| Discount Rate % | 10 |
| Terminal Growth % | 2.5 |
| Projection Years | 5 |
| Margin of Safety % | 25 |

| Column | Meaning |
| --- | --- |
| Fair Value | Estimated value per share from free cash flow |
| Current Price | Latest price |
| Upside to Fair Value % | How far the price is below (+) or above (−) the estimate |
| Discount from Fair Value % | (Fair Value − Price) ÷ Fair Value |
| Margin of Safety | עובר (passes) / לא עובר (fails) against your required margin |
| DCF Confidence | How many of the 6 DCF data checks hold |

"Not enough data" / "חסר נתון" means FCF was missing or negative, shares outstanding were missing, or the discount rate was not above terminal growth. Momentum-only and Yahoo scans never have a DCF.

The DCF is a **rough educational estimate**. Small changes in the assumptions move it a lot. It ignores debt and cash, and it doesn't affect the total score.

## 9. Export CSV

Click **ייצא CSV** (export CSV) to download `value_stock_finder_results.csv` with the **displayed top-N** results, including the DCF fields and the data provider.

## 10. Clear cache or API key

- **נקה Cache** (clear cache) removes saved responses. The next scan fetches fresh data and uses more API calls.
- **נקה API Key שמור** (clear saved API key) removes the saved key from this browser.

## 11. Troubleshooting

| Problem | What to do |
| --- | --- |
| "חסר API Key" (missing API key) | Enter your FMP key, or select Yahoo only for a browser test. |
| Many "חסר" columns | Your FMP plan may restrict endpoints. Run **בדוק endpoints על AAPL** (test endpoints on AAPL). You may also be in Momentum mode. |
| "הגעת למגבלת הבקשות של FMP" (you've reached FMP's request limit) | Wait, use smaller lists, or rely on the cache. Partial results are shown. |
| Yahoo: "Yahoo quote request failed…" | Expected: the browser blocked the request (CORS). Switch to FMP. |
| Yahoo + Deep Scan / Two-stage warning | Yahoo is quote-only. Choose Momentum, or switch to FMP. |
| Two-stage showed only "Stage 1 בלבד" (Stage 1 only) / **Preliminary** rows | You stopped during Stage 1, an FMP rate limit stopped Stage 2 before any deep row completed, or no stock passed the basic filter. These rows are preliminary and quote-level only: they are **not** final Deep Scan or value-score results. Their total score is a preliminary number. For full Deep Scan results, retry later (the cache keeps finished calls), lower *Deep Scan Top N*, or adjust the filters. |
| Two-stage checked fewer symbols than the list has | Only the first *Stage 1 max symbols* are checked. Raise it (up to 200). |
| All Yahoo rows show "נפסלה" (rejected) | Yahoo provides no market cap, so the basic filter fails. Use FMP. |
| Settings not remembered | Your browser may block storage, for example in private mode or embedded previews. The app still works, but won't remember anything. |
| Results look stale | Quotes are cached for 10 minutes and fundamentals for 7 days. Click **נקה Cache** (clear cache). |

## 12. Limitations and disclaimer

- Data may be missing, delayed or defined differently than in your course.
- Relative comparisons use only your scanned list.
- At most 5 years of history are used.
- US presets only, hand-curated. There is no automatic market-wide discovery. TASE and global support are planned for the future.
- Your API key cannot be truly hidden in a static web page.

**This tool does not provide investment advice and does not tell you what to buy or sell.** Use it to learn and to decide what to research further, and consult a licensed professional for investment decisions.
