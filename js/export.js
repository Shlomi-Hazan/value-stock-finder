// Value Stock Finder: Exports: CSV (unchanged 44 columns), XLSX (ExcelJS) and PDF (jsPDF + AutoTable).
// Classic script (no modules): declarations are shared globally; see index.html for the load order.
// All three formats share buildExportRows(), so their data cannot drift apart. The XLSX/PDF libraries are
// vendored (see vendor/README.md) and loaded on demand, only when an export button is clicked.

const EXPORT_HEADERS = ["rank", "symbol", "name", "sector", "price", "marketCap", "pe", "ps", "pb", "roe", "roa", "debtEquity", "currentRatio", "fcf", "paysDividend", "dividendAmount", "dividendYield", "quickScore", "graham", "fisher", "cash", "buffett", "piotroski", "dreman", "neff", "relativeBasis", "relativePeerCount", "fairValue", "currentPrice", "upsideToFairValue", "discountFromFairValue", "marginOfSafetyPassed", "dcfConfidence", "dcfBaseFcf", "dcfGrowthRate", "dcfDiscountRate", "dcfTerminalGrowth", "dcfProjectionYears", "totalScore", "decision", "dataProvider", "scanMode", "scanStage", "stage1Rank"];

const VENDOR_BUNDLES = {
  xlsx: ["vendor/exceljs-4.4.0/exceljs.min.js"],
  pdf: ["vendor/jspdf-4.2.1/jspdf.umd.min.js", "vendor/jspdf-autotable-5.0.8/jspdf.plugin.autotable.min.js"]
};
const vendorScriptPromises = {};

const EXPORT_DISCLAIMER_EN = "Educational tool only. Not investment advice. Scores, fair-value estimates and margins of safety are mechanical outputs of simplified rules applied to third-party data that may be incomplete or wrong.";
const EXPORT_DISCLAIMER_HE = "כלי לימודי בלבד ואינו ייעוץ השקעות. הציונים, אומדני השווי ההוגן ומרווח הביטחון הם תוצאה מכנית של כללים פשוטים על נתונים חיצוניים שעלולים להיות חסרים או שגויים.";

// The decision labels the app produces (scoring.js), translated for the PDF, whose standard fonts have no Hebrew glyphs.
const DECISION_LABELS_EN = { "מועמדת חזקה": "Strong candidate", "Watchlist": "Watchlist", "בדיקה ידנית": "Manual review", "נפסלה": "Rejected" };
const SCAN_MODE_LABELS = { deep: "Deep Scan", quick: "Momentum / Market", twoStage: "Two-stage scan" };

// One row of raw export values per displayed result, in EXPORT_HEADERS order (identical to the original CSV builder).
function buildExportRows() {
  return lastResults.map((row, i) => {
    const m = row.m;
    return [
      i + 1,
      m.symbol,
      m.name,
      m.sector || m.industry || "",
      m.price,
      m.marketCap,
      m.pe,
      m.ps,
      m.pb,
      m.roe,
      m.roa,
      m.debtEquity,
      m.currentRatio,
      m.fcf,
      m.paysDividend ? "yes" : "no_or_missing",
      m.dividendAmount,
      m.dividendYield,
      row.quick.score,
      row.value.graham.pct,
      row.value.fisher.pct,
      row.value.cash.pct,
      row.value.buffett.pct,
      row.value.piotroski.score,
      row.value.dreman?.pct,
      row.value.neff?.pct,
      row.relativeBasis?.label,
      row.relativeBasis?.peerCount,
      row.dcf?.fairValuePerShare,
      m.price,
      row.dcf?.upsidePct,
      row.dcf?.discountFromFairValuePct,
      row.dcf?.marginPassed === null ? "" : (row.dcf?.marginPassed ? "yes" : "no"),
      row.dcf?.confidencePct,
      row.dcf?.baseFcf,
      row.dcf?.growthRate,
      row.dcf?.discountRate,
      row.dcf?.terminalGrowth,
      row.dcf?.projectionYears,
      row.totalScore,
      row.decisionText,
      providerLabel(row.raw.provider),
      row.scanMeta?.mode || lastScanStats.mode || "",
      row.scanMeta?.stage ?? "",
      row.scanMeta?.stage1Rank ?? ""
    ];
  });
}

function buildExportMeta() {
  const rows = lastResults;
  const countText = text => rows.filter(row => row.decisionText === text).length;
  const mode = rows[0]?.scanMeta?.mode || lastScanStats.mode || "";
  return {
    generatedAt: new Date(),
    provider: rows.length ? providerLabel(rows[0].raw.provider) : "",
    scanMode: SCAN_MODE_LABELS[mode] || mode,
    exportedRows: rows.length,
    evaluatedRows: allResults.length,
    strong: countText("מועמדת חזקה"),
    watchlist: countText("Watchlist"),
    manualReview: countText("בדיקה ידנית"),
    rejected: countText("נפסלה"),
    apiCalls: lastScanStats.apiCalls,
    cacheHits: lastScanStats.cacheHits,
    twoStage: lastScanStats.twoStage || null
  };
}

function exportDateStamp(date) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function exportDateTimeText(date) {
  const pad = n => String(n).padStart(2, "0");
  return `${exportDateStamp(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Feedback next to the export buttons on the Results screen (#status lives on the Setup screen).
function setExportStatus(message, type = "") {
  const el = document.getElementById("exportStatus");
  if (!el) return;
  el.className = "export-status" + (type ? " " + type : "");
  el.textContent = message;
}

function setExportButtonsBusy(busy) {
  document.querySelectorAll(".results-tools .btn").forEach(btn => { btn.disabled = busy; });
}

function loadVendorScript(src) {
  if (!vendorScriptPromises[src]) {
    vendorScriptPromises[src] = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => {
        delete vendorScriptPromises[src];
        reject(new Error(`לא ניתן לטעון את ${src}`));
      };
      document.head.appendChild(script);
    });
  }
  return vendorScriptPromises[src];
}

async function loadVendorBundle(kind) {
  for (const src of VENDOR_BUNDLES[kind]) await loadVendorScript(src);
}

function exportCSV() {
  if (!lastResults.length) {
    setStatus("אין תוצאות לייצוא", "warn");
    setExportStatus("אין תוצאות לייצוא", "warn");
    return;
  }
  const lines = [EXPORT_HEADERS.join(",")];
  buildExportRows().forEach(values => {
    lines.push(values.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, "value_stock_finder_results.csv");
  setExportStatus(`CSV נוצר: ${lastResults.length} שורות.`, "good");
}

/* ---------- XLSX (ExcelJS) ---------- */

// Excel number formats per export column. Ratios such as ROE and upside are decimals in the data, so they use
// a percent format; the stored values are exactly the CSV values.
const XLSX_NUMBER_FORMATS = {
  price: "#,##0.00", currentPrice: "#,##0.00", fairValue: "#,##0.00", dividendAmount: "#,##0.00",
  marketCap: "#,##0", fcf: "#,##0", dcfBaseFcf: "#,##0",
  pe: "0.00", ps: "0.00", pb: "0.00", debtEquity: "0.00", currentRatio: "0.00",
  roe: "0.00%", roa: "0.00%", dividendYield: "0.00%", upsideToFairValue: "0.00%", discountFromFairValue: "0.00%",
  dcfGrowthRate: "0.00%", dcfDiscountRate: "0.00%", dcfTerminalGrowth: "0.00%"
};

function xlsxCellValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return value;
}

function styleXlsxHeader(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B6B4C" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.height = 28;
}

async function exportXLSX() {
  if (!lastResults.length) { setExportStatus("אין תוצאות לייצוא", "warn"); return; }
  setExportButtonsBusy(true);
  setExportStatus("מכין קובץ XLSX…");
  try {
    await loadVendorBundle("xlsx");
    const meta = buildExportMeta();
    const rows = buildExportRows();
    const wb = new ExcelJS.Workbook();
    wb.creator = "Value Stock Finder";
    wb.created = meta.generatedAt;

    // Sheet 1: Summary
    const summary = wb.addWorksheet("Summary", { views: [{ rightToLeft: true }] });
    summary.columns = [{ key: "label", width: 34 }, { key: "value", width: 46 }];
    summary.addRow(["Value Stock Finder: results export"]).font = { bold: true, size: 14, color: { argb: "FF0B6B4C" } };
    summary.addRow([]);
    const summaryRows = [
      ["Generated (local time)", exportDateTimeText(meta.generatedAt)],
      ["Data provider", meta.provider],
      ["Scan mode", meta.scanMode],
      ["Rows exported (display limit)", meta.exportedRows],
      ["Stocks evaluated in the scan", meta.evaluatedRows],
      ["Strong candidates (in export)", meta.strong],
      ["Watchlist (in export)", meta.watchlist],
      ["Manual review (in export)", meta.manualReview],
      ["Rejected (in export)", meta.rejected],
      ["API calls / cache hits", `${meta.apiCalls} / ${meta.cacheHits}`]
    ];
    if (meta.twoStage) {
      const ts = meta.twoStage;
      summaryRows.push(["Two-stage: Stage 1 checked", `${ts.stage1Checked}/${ts.stage1Total}`]);
      summaryRows.push(["Two-stage: candidates / deep-scanned", `${ts.candidatesSelected} / ${ts.stage2Scanned}`]);
    }
    summaryRows.forEach(r => {
      const row = summary.addRow(r);
      row.getCell(1).font = { bold: true };
      row.getCell(2).alignment = { horizontal: "right" };
    });
    summary.addRow([]);
    summary.addRow(["Disclaimer", EXPORT_DISCLAIMER_EN]).getCell(2).alignment = { wrapText: true, vertical: "top" };
    summary.addRow(["הבהרה", EXPORT_DISCLAIMER_HE]).getCell(2).alignment = { wrapText: true, vertical: "top" };

    // Sheet 2: Results (the same 44 columns and values as the CSV)
    const sheet = wb.addWorksheet("Results", { views: [{ state: "frozen", ySplit: 1, rightToLeft: true }] });
    sheet.columns = EXPORT_HEADERS.map(header => ({
      header,
      key: header,
      width: Math.min(40, Math.max(11, header.length + 3, header === "name" ? 30 : 0, header === "relativeBasis" ? 28 : 0))
    }));
    rows.forEach(values => sheet.addRow(values.map(xlsxCellValue)));
    styleXlsxHeader(sheet.getRow(1));
    EXPORT_HEADERS.forEach((header, index) => {
      const format = XLSX_NUMBER_FORMATS[header];
      if (format) sheet.getColumn(index + 1).numFmt = format;
    });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EXPORT_HEADERS.length } };

    // Sheet 3: Notes
    const notes = wb.addWorksheet("Notes", { views: [{ rightToLeft: true }] });
    notes.columns = [{ width: 110 }];
    [
      ["Notes"],
      [EXPORT_DISCLAIMER_EN],
      [EXPORT_DISCLAIMER_HE],
      ["The Results sheet has the same 44 columns and values as the CSV export. Ratios (roe, roa, dividendYield, upside, discount, DCF rates) are stored as decimals and displayed as percentages."],
      ["Category scores (graham … neff, quickScore, totalScore, dcfConfidence) are 0-100 percentages; piotroski is a 0-9 score. Empty cells mean the data was missing."],
      ["Strategy rules and thresholds: docs/investment-methodology.md in the project repository."]
    ].forEach((r, i) => {
      const row = notes.addRow(r);
      row.getCell(1).alignment = { wrapText: true, vertical: "top" };
      if (i === 0) row.font = { bold: true, size: 13 };
    });

    const buffer = await wb.xlsx.writeBuffer();
    downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `value-stock-finder-results-${exportDateStamp(meta.generatedAt)}.xlsx`);
    setExportStatus(`XLSX נוצר: ${rows.length} שורות, 3 גיליונות.`, "good");
  } catch (e) {
    console.error(e);
    setExportStatus(`יצירת XLSX נכשלה: ${e.message || e}`, "bad");
  } finally {
    setExportButtonsBusy(false);
  }
}

/* ---------- PDF (jsPDF + AutoTable) ---------- */

function pdfNumber(value, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function pdfMoney(value) {
  return typeof value === "number" && Number.isFinite(value) ? "$" + value.toFixed(2) : "-";
}

function pdfPercent(value) {
  return typeof value === "number" && Number.isFinite(value) ? (value * 100).toFixed(1) + "%" : "-";
}

// The PDF uses jsPDF's standard fonts (Latin only), so any non-Latin text is replaced rather than printed as garbage.
function pdfLatin(text) {
  const s = String(text ?? "");
  return /[^\u0000-ɏ]/.test(s) ? s.replace(/[^\u0000-ɏ]+/g, "?").trim() : s;
}

async function exportPDF() {
  if (!lastResults.length) { setExportStatus("אין תוצאות לייצוא", "warn"); return; }
  setExportButtonsBusy(true);
  setExportStatus("מכין קובץ PDF…");
  try {
    await loadVendorBundle("pdf");
    const meta = buildExportMeta();
    const rows = buildExportRows();
    const col = name => EXPORT_HEADERS.indexOf(name);
    const doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 36;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(11, 107, 76);
    doc.text("Value Stock Finder Results", margin, 46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 50, 45);
    const info = [
      `Generated: ${exportDateTimeText(meta.generatedAt)}   |   Provider: ${pdfLatin(meta.provider)}   |   Scan mode: ${pdfLatin(meta.scanMode)}`,
      `Rows exported: ${meta.exportedRows} (of ${meta.evaluatedRows} evaluated)   |   Strong candidates: ${meta.strong}   |   Watchlist: ${meta.watchlist}   |   Manual review: ${meta.manualReview}   |   Rejected: ${meta.rejected}`
    ];
    info.forEach((line, i) => doc.text(line, margin, 66 + i * 14));
    doc.setFontSize(8.5);
    doc.setTextColor(90, 99, 93);
    doc.text(doc.splitTextToSize(EXPORT_DISCLAIMER_EN, pageWidth - margin * 2), margin, 100);

    const body = rows.map((v, i) => {
      const mos = v[col("marginOfSafetyPassed")];
      const discount = v[col("discountFromFairValue")];
      return [
        v[col("rank")],
        pdfLatin(v[col("symbol")]),
        pdfLatin(v[col("name")] || "-"),
        DECISION_LABELS_EN[v[col("decision")]] || pdfLatin(v[col("decision")]),
        v[col("totalScore")] ?? "-",
        pdfMoney(v[col("currentPrice")]),
        pdfMoney(v[col("fairValue")]),
        pdfPercent(v[col("upsideToFairValue")]),
        mos === "" ? "-" : `${mos === "yes" ? "Pass" : "Fail"} (${pdfPercent(discount)})`,
        typeof lastResults[i]?.dataConfidence?.pct === "number" ? lastResults[i].dataConfidence.pct + "%" : "-",
        typeof v[col("dcfConfidence")] === "number" ? v[col("dcfConfidence")] + "%" : "-"
      ];
    });

    window.autoTable(doc, {
      startY: 124,
      margin: { left: margin, right: margin, bottom: 40 },
      head: [["#", "Symbol", "Company", "Decision", "Score", "Price", "Fair Value", "Upside", "Margin of Safety", "Data Conf.", "DCF Conf."]],
      body,
      showHead: "everyPage",
      theme: "striped",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: [11, 107, 76], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [242, 247, 244] },
      columnStyles: {
        0: { halign: "center", cellWidth: 24 }, 1: { fontStyle: "bold", cellWidth: 52 }, 2: { cellWidth: 170 },
        4: { halign: "center" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" },
        9: { halign: "center" }, 10: { halign: "center" }
      },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120, 128, 123);
        doc.text("Value Stock Finder - educational tool, not investment advice", margin, pageHeight - 18);
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin, pageHeight - 18, { align: "right" });
      }
    });

    downloadBlob(doc.output("blob"), `value-stock-finder-results-${exportDateStamp(meta.generatedAt)}.pdf`);
    setExportStatus(`PDF נוצר: ${rows.length} שורות.`, "good");
  } catch (e) {
    console.error(e);
    setExportStatus(`יצירת PDF נכשלה: ${e.message || e}`, "bad");
  } finally {
    setExportButtonsBusy(false);
  }
}
