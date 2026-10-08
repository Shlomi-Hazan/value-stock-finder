# ADR-0003: No backend or proxy yet

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

A backend or proxy could hide the FMP key, add CORS for providers like Yahoo, share a cache and run large scans. It would also add hosting, deployment, cost, secret management and abuse protection. The app is a personal, locally run tool (see [ADR-0001](ADR-0001-single-file-static-app.md)), and FMP already works directly from the browser.

## Decision

Do **not** add a backend, serverless function or proxy at this stage. All provider calls stay browser-direct.

## Security tradeoffs

| Without backend (current) | With backend (deferred) |
| --- | --- |
| The key lives in the browser: the input, `localStorage` and the URL query string | The key stays in server environment variables |
| Anyone with access to the browser or dev tools can read the key | The browser never sees the key |
| No server to attack or secure | The proxy needs auth and rate limiting, or anyone can spend the quota |
| No hosting cost | Hosting and maintenance |

## API key limitation

**A static HTML app cannot truly hide an API key.** This is an accepted limitation, documented in [security.md](../security.md) and the README. The mitigations are guidance only: use your own key, run locally, never publish a copy with a key, clear the key on shared machines, and rotate it if exposed.

## When to revisit

- The app needs to be **hosted for other people**, or shared publicly.
- A **CORS-restricted or server-only provider** becomes necessary.
- **Large-universe or scheduled scans** exceed what a browser tab can do.
- A shared server-side cache becomes important for cost.

Revisiting requires explicit owner approval and a new ADR that supersedes this one.
