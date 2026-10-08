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
- Confirm `index.html` exists and that the files you plan to change exist.

## 2. Files to read

| When | Read |
| --- | --- |
| Always | [AGENTS.md](AGENTS.md), [SPEC.md](SPEC.md) |
| Code changes | [docs/architecture.md](docs/architecture.md), the relevant functions in `index.html` |
| Scoring / DCF / relative changes | [docs/investment-methodology.md](docs/investment-methodology.md) |
| Provider / network changes | [docs/api-integrations.md](docs/api-integrations.md), [ADR-0002](docs/decisions/ADR-0002-fmp-primary-provider.md) |
| Anything touching keys or storage | [docs/security.md](docs/security.md), [ADR-0003](docs/decisions/ADR-0003-no-backend-yet.md) |
| Before opening a PR | [docs/verification.md](docs/verification.md) |

## 3. Inspecting `index.html`

The file is large (around 2,400 lines). Read it in sections. Useful anchors:

```bash
grep -nE "^  (async )?function [A-Za-z]+" index.html   # function map
grep -nE "const (PRESET_LISTS|DEEP_ENDPOINTS|PROVIDERS|FMP_CACHE_PREFIX|YAHOO_)" index.html
grep -n "<th>" index.html                               # table columns (36)
```

Key functions:

| Area | Functions |
| --- | --- |
| Init / UI | `initializePage`, `onProviderChange`, `updateRequestPreview` |
| Providers | `getSelectedProvider`, `fetchStockDataByProvider`, `fetchQuoteData` |
| FMP | `fetchStockData`, `safeCall`, `callFmp`, `fetchJson` |
| Yahoo | `fetchYahooQuote`, `yahooChartToQuote` |
| Evaluation | `buildMetrics`, `evaluateStock`, `computeValueScores`, `computePiotroski`, `computeDcfEstimate`, `applyRelativeStrategies`, `recomputeTotalAndDecision` |
| Two-stage | `runTwoStageScan`, `rankStageOneCandidates`, `showTwoStageResults`, `estimateTwoStagePlan`, `readTwoStageSettings` |
| Output | `renderTable`, `renderDetails`, `exportCSV` |

## 4. Preserving existing behavior

- Make the smallest change that satisfies the request. Do not reformat or reorganize unrelated code.
- Match the existing style: global functions, 2-space indentation inside `<script>`, template-literal HTML, `escapeHtml` on dynamic values.
- When adding table columns, update `colspan="36"` everywhere, the `<th>` list, `renderTable` and `exportCSV`. Add CSV columns **at the end**.
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

- [ ] Embedded JS syntax check passes (script in [AGENTS.md §8](AGENTS.md#8-verification-required-before-every-pr))
- [ ] `git diff --check` is clean
- [ ] Secret scan shows only labels
- [ ] No `package.json`, `node_modules` or backend files
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

Details are in [docs/HISTORY.md](docs/HISTORY.md).
