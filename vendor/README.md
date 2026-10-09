# Vendored export libraries

These third-party browser bundles are used **only** by the XLSX and PDF exports (PR #12, [ADR-0006](../docs/decisions/ADR-0006-export-dependencies.md)). They are committed verbatim, pinned to exact versions, and loaded **on demand** by `js/export.js` the first time a user clicks **XLSX** or **PDF**. They are never loaded at page start and never touch scanning, scoring, providers or storage.

There is no `package.json`, `node_modules`, bundler or build step. The app still runs from `index.html` over a static server or `file://`.

| Library | Version | File | Global it defines | License | Source (npm tarball) | SHA-256 of the vendored file |
| --- | --- | --- | --- | --- | --- | --- |
| [ExcelJS](https://github.com/exceljs/exceljs) | 4.4.0 | `exceljs-4.4.0/exceljs.min.js` (`dist/exceljs.min.js`) | `ExcelJS` | MIT (`exceljs-4.4.0/LICENSE`) | `https://registry.npmjs.org/exceljs/-/exceljs-4.4.0.tgz` | `7e49da68588e250dbb8bba190d2caa8ab3787cc0284bda1d8b2f805c4df742c9` |
| [jsPDF](https://github.com/parallax/jsPDF) | 4.2.1 | `jspdf-4.2.1/jspdf.umd.min.js` (`dist/jspdf.umd.min.js`) | `jspdf` (`jspdf.jsPDF`) | MIT (`jspdf-4.2.1/LICENSE`) | `https://registry.npmjs.org/jspdf/-/jspdf-4.2.1.tgz` | `e6551fcdc32f09d6853b2c5126d18d01d9447e0da618a41a11ebeee0f6c20d54` |
| [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) | 5.0.8 | `jspdf-autotable-5.0.8/jspdf.plugin.autotable.min.js` (`dist/jspdf.plugin.autotable.min.js`) | `autoTable`, `applyPlugin` and its other exports, copied onto `window` | MIT (`jspdf-autotable-5.0.8/LICENSE.txt`) | `https://registry.npmjs.org/jspdf-autotable/-/jspdf-autotable-5.0.8.tgz` | `a65dff2c6a8296b16aff24e69f7683cd7dbaed4a4ec26b507d6840ee27d54649` |

npm registry integrity of the tarballs (verified by `npm pack`):

- `exceljs@4.4.0`: `sha512-XctvKaEMaj1Ii9oDOqbW/6e1gXknSY4g/aLCDicOXqBE4M0nRWkUu0PTp++UPNzoFY12BNHMfs/VadKIS6llvg==`
- `jspdf@4.2.1`: `sha512-YyAXyvnmjTbR4bHQRLzex3CuINCDlQnBqoSYyjJwTP2x9jDLuKDzy7aKUl0hgx3uhcl7xzg32agn5vlie6HIlQ==`
- `jspdf-autotable@5.0.8`: `sha512-Hy05N86yBO7CXBrnSLOge7i1ZYpKH2DjQ94iybaP7vBhSInjvRBgDc99ngKzSbSO8Jc98ZCally8I6n0tj2RJQ==` (its peer range `jspdf ^2 || ^3 || ^4` covers 4.2.1)

`.gitattributes` marks the vendored `.js` bundles as `-whitespace -diff linguist-vendored` and their license files as `-whitespace`, because the upstream bundles contain trailing whitespace in embedded license comments and must stay byte-identical. `git diff --check` therefore skips them, and diffs show them as binary.

Source maps are not vendored. The two `.min.js` files that end with a `sourceMappingURL` comment may log a harmless 404 for the `.map` file **only while browser devtools is open**.

## Security notes (audit run 2026-10-09)

`npm audit` on exactly these three versions reported:

- **jsPDF 4.2.1, jsPDF-AutoTable 5.0.8:** no known vulnerabilities.
- **ExcelJS 4.4.0: one moderate advisory, inherited from its bundled `uuid`** ("missing buffer bounds check in v3/v5/v6 when `buf` is provided").
  - The issue only applies when a caller passes its own output buffer to `uuid`. ExcelJS generates IDs internally, with no caller-supplied buffer.
  - In this app ExcelJS only *writes* a workbook from the user's own in-memory scan results, in the user's own browser. It never parses untrusted files.
  - npm's only suggested "fix" is downgrading to ExcelJS 3.4.0, an older and less capable release, so the advisory is accepted and documented here.
  - Re-check when a newer ExcelJS is released.

Not chosen: SheetJS (`xlsx@0.18.5` on npm). That npm release is stale and has known prototype-pollution and ReDoS advisories, and the free edition cannot style cells (header fill, number formats).

## How to update a library

1. Download and extract the exact version from the npm registry, in a scratch folder **outside the repo**:

   ```bash
   npm pack exceljs@<version>
   tar -xzf exceljs-<version>.tgz
   ```

2. Copy `package/dist/<file>.min.js` and `package/LICENSE*` into a new `vendor/<name>-<version>/` folder, and delete the old folder.
3. Update the path in `VENDOR_BUNDLES` in `js/export.js`.
4. Record the new SHA-256 (`shasum -a 256 vendor/<name>-<version>/*.min.js`) and the npm integrity (`npm view <name>@<version> dist.integrity`) in the table above.
5. Run `npm audit` against the new versions in a scratch `package.json` (not committed), and record the result here.
6. Re-run the export checks in [docs/verification.md](../docs/verification.md): open the XLSX and the PDF and check the counts.

Never load these libraries from a CDN at runtime, and never add a library here for anything other than file export without a new ADR.
