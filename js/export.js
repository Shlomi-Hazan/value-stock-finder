// Value Stock Finder: CSV export.
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

function exportCSV() {
  if (!lastResults.length) { setStatus("אין תוצאות לייצוא", "warn"); return; }
  const headers = ["rank", "symbol", "name", "sector", "price", "marketCap", "pe", "ps", "pb", "roe", "roa", "debtEquity", "currentRatio", "fcf", "paysDividend", "dividendAmount", "dividendYield", "quickScore", "graham", "fisher", "cash", "buffett", "piotroski", "dreman", "neff", "relativeBasis", "relativePeerCount", "fairValue", "currentPrice", "upsideToFairValue", "discountFromFairValue", "marginOfSafetyPassed", "dcfConfidence", "dcfBaseFcf", "dcfGrowthRate", "dcfDiscountRate", "dcfTerminalGrowth", "dcfProjectionYears", "totalScore", "decision", "dataProvider", "scanMode", "scanStage", "stage1Rank"];
  const lines = [headers.join(",")];
  lastResults.forEach((row, i) => {
    const m = row.m;
    const values = [
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
    ].map(v => `"${String(v ?? "").replaceAll('"', '""')}"`);
    lines.push(values.join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "value_stock_finder_results.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
