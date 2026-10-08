# ADR-0001: Keep the app as a single-file static HTML app

- **Status:** Superseded by [ADR-0004](ADR-0004-split-static-assets.md) (PR #8). Kept as historical context.
- **Date:** 2026-10-08 (records the approach used since the initial commit `238d062`)

## Context

Value Stock Finder started as a personal screener for one user following a value-investing course. It needs a UI, API calls to FMP, scoring logic and CSV export. Each of these is achievable with plain HTML, CSS and JavaScript in a modern browser. Three PRs have since extended the same file (cache, DCF, providers), and the owner has explicitly asked agents not to convert it to a framework.

## Decision

Keep the entire application in **one file, `index.html`**, with inline CSS and vanilla JavaScript. No framework, no build step, no package manager, no external scripts.

## Consequences

### Benefits

- **Zero setup:** open the file and it runs. Nothing to install or build.
- **No supply-chain risk:** no dependencies to audit or update.
- **Portable:** easy to copy, archive or open offline (data calls still need the network).
- **Agent-friendly scope:** one file to inspect, with clear constraints.

### Tradeoffs

- The file is large (about 2,100 lines when this ADR was written; about 2,400 after PR #6), so navigation and diffs get harder as it grows.
- Global functions with no modules mean naming collisions are possible, and isolation is weak.
- No automated unit tests without extracting code or adding tooling.
- No way to hide secrets (see [ADR-0003](ADR-0003-no-backend-yet.md)).
- Merge conflicts are more likely when several branches touch the same file.

## Revisit conditions

Reconsider, with a new ADR, if any of these happen:

- The file grows well past a maintainable size, or several contributors work in parallel.
- Automated tests are needed that can't run against the single file.
- A backend or proxy is approved. This alone does not require a framework, but it changes the deployment shape.
- The UI needs complex state that vanilla JS handles poorly.

A first step could be splitting into `index.html` + `app.js` + `styles.css` while staying static and dependency-free.
