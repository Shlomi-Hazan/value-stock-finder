# User Guide

Last updated: 2026-10-08

> ⚠️ Value Stock Finder is an **educational tool, not investment advice**. It applies simplified checklists to third-party data that may be incomplete or wrong.

The app's interface is in Hebrew. This guide gives each Hebrew label with its English meaning.

---

## 1. Open the app

- **Simplest:** double-click `index.html` to open it in Chrome, Edge, Firefox or Safari.
- **Recommended:** from the project folder, run:

  ```bash
  python3 -m http.server 8000
  ```

  Then open <http://localhost:8000/>.

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

  Each preset has 30 US symbols.
- **ידני - לא לשנות את הרשימה** (manual, keep my list): type your own symbols in **רשימת מניות לבדיקה** (list of stocks to check), separated by commas, spaces or new lines. Example: `AAPL, MSFT, KO, JNJ`. Use FMP-style symbols such as `BRK-B`.

## 5. Choose the scan mode

| Mode | Cost | Result |
| --- | --- | --- |
| **Value Scan מלא ככל האפשר** (full value scan, default) | 10 API calls per symbol | All strategies, Piotroski, relative checks, DCF |
| **Momentum / Market בלבד** (momentum / market only) | 1 API call per symbol | Momentum score only. The other columns show "חסר" (missing). |

The line under the buttons previews the cost, including how many responses will come from the cache. A Deep Scan of more than 10 symbols asks you to confirm first.

Other settings:

- **כמות להצגה** (how many to show): top-N rows, default 15.
- **שווי שוק מינימלי בארה״ב / מחוץ לארה״ב** (minimum market cap, US / outside the US): default 2B / 1B.
- **Volume מינימלי** (minimum volume): default 100,000.
- **מחיר מינימלי** (minimum price): default 5.
- DCF assumptions: see §8.

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
| מקור נתונים | Data source: API calls vs cache. Yahoo rows carry a Yahoo badge. |
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
| Yahoo + Deep Scan warning | Yahoo is quote-only. Choose Momentum, or switch to FMP. |
| All Yahoo rows show "נפסלה" (rejected) | Yahoo provides no market cap, so the basic filter fails. Use FMP. |
| Settings not remembered | Your browser may block storage, for example in private mode or embedded previews. The app still works, but won't remember anything. |
| Results look stale | Quotes are cached for 10 minutes and fundamentals for 7 days. Click **נקה Cache** (clear cache). |

## 12. Limitations and disclaimer

- Data may be missing, delayed or defined differently than in your course.
- Relative comparisons use only your scanned list.
- At most 5 years of history are used.
- US presets only. TASE and global support are planned for the future.
- Your API key cannot be truly hidden in a static web page.

**This tool does not provide investment advice and does not tell you what to buy or sell.** Use it to learn and to decide what to research further, and consult a licensed professional for investment decisions.
