# AGENTS.md

Permanent instructions for AI coding agents (Claude Code, Codex, Cursor, Copilot agents and others) working on **Value Stock Finder**.

If anything here conflicts with a direct instruction from the repository owner in the current session, the owner's instruction wins. Agent-specific files such as [CLAUDE.md](CLAUDE.md) add detail but do not override this file.

---

## 1. Project identity

- **What it is:** a personal, educational value-investing stock screener.
- **What it is not:** an advice engine, a trading tool or a product that guarantees results.
- **Form:** one static file, `index.html` (HTML + CSS + vanilla JS). There is no backend, no build step and no dependencies.
- **Primary data provider:** Financial Modeling Prep (FMP).
- **Experimental provider:** Yahoo Finance Experimental / Browser test only. It is quote-level, usually CORS-blocked, and not a replacement for FMP.
- **UI language:** Hebrew, RTL. Metric names stay in English.
- **Repository:** `Shlomi-Hazan/value-stock-finder`. The default branch is `main`.

Read before substantial work: [SPEC.md](SPEC.md), [docs/architecture.md](docs/architecture.md), [docs/investment-methodology.md](docs/investment-methodology.md), [docs/decisions/](docs/decisions/).

## 2. Repository workflow

Unless the owner says **"audit only"**, a task includes the full workflow:

1. Verify the repository state (`git status`, current branch, recent log).
2. Update `main`: `git checkout main && git pull --ff-only origin main`.
3. Create a feature branch from `main`.
4. Make the change. Keep the scope tight.
5. Run the checks in §8.
6. Commit with a clear message.
7. Push the branch.
8. Open a PR against `main`.
9. Report the commit SHA and PR URL.

For **"audit only"** tasks: read and report. Do not modify files, commit or push.

## 3. Branch and PR rules

- **Never push to `main` directly.**
- **Never merge a PR** unless the owner explicitly asks in the current session.
- Branch names: `feature/<short-kebab-description>`, or `fix/…`, `docs/…`, unless the owner names the branch.
- One concern per branch. Do not mix documentation, features and refactors unless asked.
- Follow-up fixes requested on an open PR go on **the same branch**.
- PR description: summary, behavior changes (explicit), verification performed, known limitations.
- Do not force-push over someone else's commits. Do not rewrite merged history.

## 4. Documentation vs. code tasks

| Task type | Allowed changes |
| --- | --- |
| Documentation task | Markdown files, `docs/`, `.gitignore`. **`index.html` must not change.** If a code bug is found, report it instead of fixing it. |
| Code task | `index.html`, plus the docs that describe the changed behavior, updated in the same PR |
| Audit only | No changes |

When behavior changes, update the affected docs (SPEC, methodology, user guide, history) in the same PR, so the documentation never describes a different app than the code.

## 5. Hard constraints

| Constraint | Rule |
| --- | --- |
| Single-file HTML | Keep the app in `index.html`. Do not split it into files or introduce a framework (React, Vite, Next.js…) unless the owner explicitly requests it and an ADR is added. |
| No backend | Do not add servers, serverless functions or proxies unless explicitly requested. See [ADR-0003](docs/decisions/ADR-0003-no-backend-yet.md). |
| No dependencies | No `package.json`, npm packages, CDN scripts, build tools or bundlers unless explicitly requested. |
| Preserve features | Do not remove or weaken existing functionality: FMP deep scan, cache, request preview, stop scan, rate-limit handling, endpoint tests, DCF, relative basis, data confidence, CSV export, presets, manual symbols. |
| FMP stays primary | Do not make Yahoo (or any unofficial source) the default or present it as reliable. See [ADR-0002](docs/decisions/ADR-0002-fmp-primary-provider.md). |
| Storage safety | Wrap `localStorage` access in `try/catch`. |
| Escaping | Pass every dynamic value inserted with `innerHTML` through `escapeHtml`. |

## 6. API key and secret safety

- **Never** commit, print, log or echo an API key or token, including in PR descriptions, test output and screenshots.
- Never hard-code a key into `index.html`, docs or examples. Use placeholders like `YOUR_FMP_API_KEY` only when needed.
- Do not add code that sends the key anywhere except the provider's own API.
- Remember that a static frontend cannot hide keys. Don't write docs or UI text implying otherwise.
- Run the secret scan in §8 before every commit.

## 7. Scoring and financial-content rules

- **Do not silently change scoring rules.** Any change to a threshold, weight, test, category, decision rule, DCF formula, growth cap or data-confidence rule is a behavior change. It must be:
  1. explicitly requested or explicitly proposed to the owner,
  2. listed under "Behavior changes" in the PR description, and
  3. reflected in [docs/investment-methodology.md](docs/investment-methodology.md) and [SPEC.md](SPEC.md).
- Keep the "inspired by" / "approximate" wording. Never claim the app reproduces a professional strategy exactly.
- Keep the financial disclaimer: educational tool, not investment advice. Never describe a stock as good or bad, and never imply returns.
- Label experimental and planned features as such.

## 8. Verification (required before every PR)

Run these from the repository root and report the results.

**1. Embedded JavaScript syntax check**

```bash
python3 - <<'PY'
from pathlib import Path
import re, subprocess, tempfile, os
html = Path("index.html").read_text(encoding="utf-8")
scripts = re.findall(r"<script>(.*?)</script>", html, flags=re.S)
if not scripts:
    raise SystemExit("No script tag found")
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
    f.write("\n".join(scripts)); p = f.name
try:
    r = subprocess.run(["node", "--check", p], text=True, capture_output=True)
    print(r.stdout + r.stderr, end="")
    if r.returncode == 0: print("script syntax ok")
    raise SystemExit(r.returncode)
finally:
    os.remove(p)
PY
```

**2. Whitespace check**

```bash
git diff --check
```

**3. Secret scan.** Hits on labels such as `apiKey` or "API Key" are fine. A real key value is not.

```bash
grep -RInE "sk-|AIza|secret|token|api[_-]?key|apikey|BEGIN PRIVATE KEY|password" --exclude-dir=.git .
```

**4. No dependencies or backend added**

```bash
ls package.json node_modules vite.config.* next.config.* 2>/dev/null || echo "none"
```

**5. Behavior checks.** For code changes, follow the manual checklist in [docs/verification.md](docs/verification.md).

Report honestly. If a check failed or was skipped, say so. "The agent says it works" is not verification. Distinguish what you actually ran from what you assume.

## 9. Expected final response format

After a task, report:

1. **Orientation:** branch before work, `main` HEAD, files inspected.
2. **Summary of changes:** what changed and why. List behavior changes explicitly, or write "none".
3. **Assumptions / limitations.**
4. **Verification:** each command and its result.
5. **Commit SHA(s).**
6. **PR URL.**
7. **Final `git status`.**

## 10. Agent-specific guidance

| Agent | Guidance |
| --- | --- |
| **Claude Code** | Also read [CLAUDE.md](CLAUDE.md). Use `gh` for PRs. Verify in a browser when possible. |
| **Codex** | Treat this file as the contract. Run the §8 checks in the sandbox. If network or `gh` is unavailable, say so rather than claiming a push or PR. |
| **Other agents / IDE assistants** | Same rules. When unsure about scope, ask before editing `index.html`. |

All agents:

- Inspect before editing. `index.html` is about 2,100 lines; read the relevant functions, not just search hits.
- Do not assume work by another agent is correct. Verify it against the code.
- Never discard uncommitted work you did not create.
- Ask the owner before architecture changes, new providers, dependency or backend additions, or scoring changes.
