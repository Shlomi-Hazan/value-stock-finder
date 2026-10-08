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

## Planned and future work

| Item | Status | Description | Notes |
| --- | --- | --- | --- |
| Automatic universe discovery | 🗓 Planned | Source symbols from a screener or index list instead of curated presets | Depends on the FMP plan and browser limits. Would feed Two-stage scan. |
| Value-aware Stage 1 ordering | 🗓 Planned | A cheaper Stage 1 signal that doesn't favor momentum (for example, a quote-level P/E if available) | Would be a scoring change, so it needs explicit approval |
| Better provider abstraction | 🗓 Planned | Capability-based provider interface | Keep FMP behavior identical |
| Tests / CI | 🗓 Planned | GitHub Actions running the syntax and secret checks; unit tests for pure scoring functions | Must not add runtime dependencies |
| Better UI | 🗓 Planned | Column groups, inline explanations, screenshots in README | Keep RTL |
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
