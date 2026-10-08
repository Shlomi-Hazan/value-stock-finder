# ADR-0004: Split the app into static files (no build step)

- **Status:** Accepted
- **Date:** 2026-10-08 (PR #8)
- **Supersedes:** [ADR-0001](ADR-0001-single-file-static-app.md), which kept the whole app in a single `index.html`

## Context

[ADR-0001](ADR-0001-single-file-static-app.md) kept everything in one `index.html` for zero setup. After the Two-stage scan (PR #6) and the hardening pass (PR #7), the file reached about 2,400 lines: around 240 lines of CSS and around 1,900 lines of JavaScript (133 top-level declarations). Reviews, diffs and agent edits had become hard to scope, and every change touched the same file.

The reasons behind ADR-0001 still hold: no install, no build, no dependencies and no backend ([ADR-0003](ADR-0003-no-backend-yet.md)).

## Decision

Split the app into plain static files, keeping the same runtime model:

```text
index.html     markup only (same IDs, text, table and inline handlers)
styles.css     the former inline <style>, unchanged
js/            12 classic scripts, loaded with defer in this order:
  constants.js  state.js  utils.js  cache.js  providers.js  metrics.js
  dcf.js  scoring.js  render.js  scan.js  export.js  app.js
```

- **Classic scripts, not ES modules.** Top-level `function`, `const` and `let` declarations stay global, so the existing inline handlers (`onclick="scanStocks()"` and similar) and the cross-file calls work unchanged. `app.js` is last and is the only file that runs code at load time (`initializePage()`).
- **Code moved verbatim.** Each top-level declaration was moved as-is, with only its indentation removed. No function was rewritten.
- Still no `package.json`, bundler, transpiler, framework, dependency or backend. The folder can be served by any static host (for example GitHub Pages or `python3 -m http.server`).

## Consequences

### Benefits

- Easier maintenance and review: changes land in the file that owns the concern (scoring, DCF, providers, rendering…).
- Smaller, more focused diffs and fewer merge conflicts.
- Clearer boundaries for agents (see the file map in [CLAUDE.md](../../CLAUDE.md) and [architecture.md](../architecture.md)).

### Trade-offs

- **More files to load:** 1 stylesheet + 12 scripts instead of 1 file. This is negligible for a local tool.
- **Script order matters.** A file may call functions from any other file at runtime, but nothing except `app.js` may run code at load time that depends on a later file. New files need a `<script defer>` tag in the right place.
- **Globals remain.** Classic scripts share one global scope, so name collisions are still possible, and file boundaries are a convention, not an enforced interface.
- The inline-`<script>` syntax check no longer applies. Verification now runs `node --check` on every `js/*.js` file, plus a script-order check ([verification.md](../verification.md)).
- Opening `index.html` directly from disk is expected to keep working, because classic scripts load over `file://`. A local static server remains the recommended way to run the app.

## Revisit conditions

- Move to ES modules (`type="module"`) if explicit imports and exports become worth it. That requires replacing the inline handlers and means `file://` stops working, so the app would have to be served.
- Add a build tool only if the owner explicitly approves a dependency or tooling change.
- Revisit if a backend or proxy is ever approved ([ADR-0003](ADR-0003-no-backend-yet.md)).
