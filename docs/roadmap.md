# Roadmap

Last updated: 2026-10-08

Legend: ✅ **Done** · 🧪 **Experimental** · 🗓 **Planned** (intended next, scope still to be agreed) · 🔭 **Future** (direction only, not committed)

Nothing marked Planned or Future is implemented. Each needs owner approval before work starts.

## Completed milestones

| Milestone | Status | Delivered |
| --- | --- | --- |
| **M0** Initial static app | ✅ Done | Single-file screener: preset lists, FMP quote + deep endpoints, Graham/Fisher/Cash/Buffett/Piotroski/Dreman/Neff scoring, results table, CSV (`238d062`) |
| **M1** Cache / confidence / rate-limit safety | ✅ Done | Local FMP cache, request preview, stop scan, rate-limit halt, EPS CAGR and Graham total EPS growth fix, Data Confidence, safer labels (PR #1) |
| **M2** DCF / fair value | ✅ Done | DCF assumptions, Estimated Fair Value, upside/discount/MoS, DCF Confidence, relative basis labels, US vs non-US market-cap threshold (PR #2) |
| **M3** Provider abstraction / Yahoo experimental | ✅ Done · Yahoo 🧪 Experimental | Provider selector, FMP default, Yahoo quote-only browser test, Deep Scan blocked for Yahoo, selected-provider test, CSV `dataProvider`, safe storage init (PR #3) |
| **M4** Documentation foundation | ✅ Done | README, SPEC, AGENTS, CLAUDE, architecture, product requirements, methodology, API integrations, security, verification, roadmap, ADRs, user guide, history (PR #4), MIT License (PR #5) |
| **M5** Two-stage scan + larger universe controls | ✅ Done | Two-stage scan (quote-only Stage 1, Deep Scan of the top N), Stage 1 max / Top N settings, per-stage request preview, stage summary, CSV stage columns, expanded US presets: Large Cap 90, Value 95, Dividend 60 (PR #6) |
| **M6** Maintainability: static file split | ✅ Done | Post-merge hardening (PR #7). `index.html` + `styles.css` + 12 classic scripts in `js/`, no build step (PR #8, [ADR-0004](decisions/ADR-0004-split-static-assets.md)) |
| **M7** UI polish and visual identity | ✅ Done | Grouped settings with collapsible advanced sections, button hierarchy, helper microcopy, segmented result tabs, green finance identity, product mark and favicon, icons and the margin-of-safety illustration (PR #9) |
| **M8** App shell navigation plan | ✅ Accepted | [ADR-0005](decisions/ADR-0005-app-shell-navigation-plan.md): a static app shell with hash-routed screens. Docs only, no code change (PR #10). |
| **M9** App shell: Setup + Results | ✅ Done | `js/shell.js`: hash router (`#/setup`, `#/results`, element-hash anchors), sticky segmented nav, global scan bar (mirrors `#status`, Stop proxy, results-ready cue, no auto-navigation), compact Results header, Export CSV on Results (PR #11) |

## App shell rollout (planned, per ADR-0005)

Each step is a separate PR that preserves all existing IDs, handlers, `localStorage` keys, scan, scoring, CSV (44 columns) and table (36 columns). There is no framework, build step or backend.

| Milestone | Planned PR | Status | Scope |
| --- | --- | --- | --- |
| **M9** App shell: Setup + Results | #11 | ✅ Done | Delivered as planned. On phones the nav is a full-width sticky segmented control at the top rather than a bottom tab bar, so it never covers the table's horizontal scroll area or the action dock. |
| **M10** Results details dialog + XLSX/PDF exports | #12 | ✅ Done | Inserted before the remaining shell stages at the owner's request: native `<dialog>` for row details; real XLSX and PDF from shared export rows; vendored on-demand libraries ([ADR-0006](decisions/ADR-0006-export-dependencies.md)). |
| **M11** Methodology screen | #13 | 🗓 Planned | In-app plain-language explanation of the strategies, Data Confidence, DCF and margin of safety, and the Two-stage bias. Links to `docs/investment-methodology.md` (no thresholds duplicated). |
| **M12** Results UX refinement | #14 | 🗓 Planned | Sticky summary or toolbar, display-limit note, better empty and preliminary states, column-group hints |
| **M13** Settings & tools screen | #15 | 🗓 Planned | Endpoint tests, Clear Cache, Clear saved API key, storage explanation. API key **entry** stays in Setup. |

## Planned and future work

| Item | Status | Description | Notes |
| --- | --- | --- | --- |
| Automatic universe discovery | 🗓 Planned | Source symbols from a screener or index list instead of curated presets | Depends on the FMP plan and browser limits. Would feed Two-stage scan. |
| Value-aware Stage 1 ordering | 🗓 Planned | A cheaper Stage 1 signal that doesn't favor momentum (for example, a quote-level P/E if available) | Would be a scoring change, so it needs explicit approval |
| Better provider abstraction | 🗓 Planned | Capability-based provider interface | Keep FMP behavior identical |
| Tests / CI | 🗓 Planned | GitHub Actions running the syntax and secret checks; unit tests for pure scoring functions | Must not add runtime dependencies |
| Better UI | 🗓 Planned | Screenshots in README; remaining items are covered by the app shell rollout above | Keep RTL |
| Israel / TASE support | 🔭 Future | TASE symbols, ILS handling, TASE thresholds | Needs a provider with TASE coverage |
| Global country support | 🔭 Future | Per-country presets, FX normalization, exchange detection | |
| Optional backend / proxy | 🔭 Future | Hide the API key, enable CORS-restricted providers, server cache | Requires a new ADR superseding [ADR-0003](decisions/ADR-0003-no-backend-yet.md) |
| Yahoo as a usable provider | 🔭 Future | Only possible behind a proxy, and only if the terms allow it | Stays 🧪 until then |

## Known issues to consider (documented, not scheduled)

- The DCF does not adjust for net debt or cash.
- The Fisher "2 of 3 cheap" test treats missing multiples as not cheap.
- Piotroski counts missing tests as 0.
- The US-listing detection is a keyword heuristic.
- CSV exports the top-N results, not the active tab filter.
- **Clear Cache can leave an entry behind** (found in PR #12): `clearCache()` removes keys while iterating `localStorage` by index. Browsers do not keep key order stable during removal, so with roughly 20–50 entries one key can survive. Fix: collect the keys first, then remove them. It is tracked as its own task. It also explains the occasional "one call fewer" readings in the PR #8, #9 and #11 test logs, which were then misattributed to the test harness.
- **Percent display for values below −100%:** `formatPercentValue(v, true)` treats any |v| > 1 as already a percentage, so a −101% discount shows as "−1.01%" in the table and the details dialog. The PDF and XLSX use the raw decimal and are correct.
