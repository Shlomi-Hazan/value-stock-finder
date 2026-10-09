# ADR-0006: Vendored, on-demand libraries for XLSX and PDF export

## Status

**Accepted** (2026-10-09, PR #12). This is a narrow exception to the "no dependencies" rule in [AGENTS.md](../../AGENTS.md) and [ADR-0004](ADR-0004-split-static-assets.md). It covers file export only.

## Context

Until PR #12 the Results screen exported CSV only. The owner asked for real `.xlsx` and real `.pdf` files: a workbook with sheets, frozen headers and number formats, and a paginated PDF, not a print dialog. Writing those binary formats by hand would be large, fragile and hard to review. Mature, MIT-licensed browser libraries exist for both.

The project constraints otherwise still hold: a static frontend, no backend, no build step, classic scripts, and it runs from `file://` or any static server.

## Decision

1. **XLSX: ExcelJS 4.4.0.**
   - It writes real Office Open XML workbooks in the browser.
   - It supports multiple sheets, frozen panes, column widths, number formats, header styling, autofilter and right-to-left sheet views.
   - SheetJS was rejected. The `xlsx@0.18.5` release on npm is stale with known advisories, and its free edition cannot style cells.
2. **PDF: jsPDF 4.2.1 plus jsPDF-AutoTable 5.0.8.**
   - Together they generate a real PDF in the browser, with automatic table pagination, header rows repeated on every page, and per-page footers.
   - pdfmake was not chosen: it is a larger bundle, its default fonts do not include Hebrew either, and it has no advantage for one table report.
3. **Vendored, not installed.**
   - The minified browser bundles are committed verbatim under `vendor/<name>-<version>/` with their licenses. Pinned versions, source URLs, SHA-256 and npm integrity hashes are recorded in [vendor/README.md](../../vendor/README.md).
   - There is still no `package.json`, `node_modules`, bundler or CDN.
4. **Loaded on demand.**
   - `js/export.js` injects the vendor `<script>` tags only when the user first clicks **XLSX** or **PDF**.
   - Page start and the app's 13-script load order are unchanged.
   - Nothing else in the app may use these libraries.
5. **One export data source.** CSV, XLSX and PDF all use `buildExportRows()`. The CSV output stays byte-identical to before PR #12, and the XLSX Results sheet holds the same 44 values.
6. **PDF fonts.**
   - The PDF uses jsPDF's built-in Helvetica (Latin only), and **no font file is embedded**, to keep the repository and the PDF small.
   - The app's Hebrew decision labels are translated to English in the PDF.
   - Any other non-Latin text is replaced with "?" rather than printed as garbage.

## Consequences

- About 1.4 MB of third-party JavaScript is in the repository. It is never downloaded during normal use, only on the first XLSX or PDF export.
- The libraries add globals when loaded: `ExcelJS`, `jspdf`, `autoTable`, `applyPlugin`, `Table`, `Row`, `Column`, `Cell`, `HookData`, `CellHookData`, `__createTable`, `__drawTable`, `default`, and the `regeneratorRuntime`, `setImmediate` and `clearImmediate` polyfills. None collides with an app global (checked in PR #12). New app code must not use those names.
- **Security:** `npm audit` on these exact versions shows one moderate advisory in ExcelJS's bundled `uuid`. It is not exploitable here, because the app never passes a caller-supplied buffer and only writes the user's own data. The assessment is in [vendor/README.md](../../vendor/README.md), together with the update procedure.
- **PDF limitations:** no Hebrew glyphs and no RTL layout in the PDF. The PDF is a compact English summary report (11 key columns). Full Hebrew support would need an embedded open-licensed Hebrew font (for example Noto Sans Hebrew, OFL, roughly 30–100 KB) and bidi handling. That is deferred and needs a new decision.
- The secret scan over `vendor/` reports library identifiers (`password`, `token`, and `secret` from crypto code bundled inside ExcelJS). These are expected false positives (see [verification.md](../verification.md)).

## Revisit conditions

- A newer ExcelJS release fixes the `uuid` advisory: update by following [vendor/README.md](../../vendor/README.md).
- Hebrew is needed in the PDF: add an OFL Hebrew font and a decision on bidi handling.
- Any non-export feature wants a dependency: that needs its own ADR. This ADR does not cover it.
