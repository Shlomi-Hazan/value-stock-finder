// Value Stock Finder: Strategy scoring, relative strategies (Dreman / Neff), total score and decision.
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

function pass(condition, label, positive, negative, points = 1) {
  if (condition === null || condition === undefined) {
    return { passed: null, label, text: "חסר נתון", points: 0, max: points };
  }
  return {
    passed: !!condition,
    label,
    text: condition ? positive : negative,
    points: condition ? points : 0,
    max: points
  };
}

function computeQuickScore(m) {
  let score = 0;
  const notes = [];
  if (m.marketCap !== null) {
    if (m.marketCap > 200_000_000_000) { score += 20; notes.push("שווי שוק גבוה"); }
    else if (m.marketCap > 10_000_000_000) { score += 14; notes.push("חברה גדולה"); }
    else if (m.marketCap > 2_000_000_000) { score += 8; notes.push("עוברת גודל בסיסי"); }
  }
  if (m.volume !== null) {
    if (m.volume > 20_000_000) { score += 18; notes.push("Volume גבוה מאוד"); }
    else if (m.volume > 1_000_000) { score += 12; notes.push("Volume טוב"); }
    else if (m.volume > 100_000) { score += 6; notes.push("Volume בסיסי"); }
  }
  if (m.price && m.priceAvg50 && m.price > m.priceAvg50) { score += 15; notes.push("מעל ממוצע 50"); }
  if (m.price && m.priceAvg200 && m.price > m.priceAvg200) { score += 20; notes.push("מעל ממוצע 200"); }
  if (m.changePercentage !== null) {
    if (m.changePercentage > 3) { score += 10; notes.push("יום חזק"); }
    else if (m.changePercentage > 0) { score += 5; notes.push("יום חיובי"); }
  }
  if (m.yearHigh && m.yearLow && m.yearHigh !== m.yearLow && m.price) {
    const pos = (m.price - m.yearLow) / (m.yearHigh - m.yearLow);
    if (pos > 0.85) { score += 17; notes.push("קרובה לשיא שנתי"); }
    else if (pos > 0.65) { score += 11; notes.push("בחלק העליון של הטווח"); }
    else if (pos > 0.5) { score += 5; notes.push("מעל אמצע הטווח השנתי"); }
  }
  return { score: Math.min(100, Math.round(score)), notes };
}

function scoreCategory(tests) {
  const available = tests.filter(t => t.passed !== null);
  const max = available.reduce((s,t)=>s+t.max,0);
  const score = available.reduce((s,t)=>s+t.points,0);
  const pct = max ? Math.round((score / max) * 100) : null;
  return { score, max, pct, tests };
}

function computeValueScores(m, settings) {
  const epsCagr = epsAnnualCagr(m);
  const epsTotalGrowth = epsMultiYearTotalGrowth(m);
  const marginMin = m.isTechPharma ? 0.15 : 0.08;
  const peMax = m.isTechPharma ? 25 : 15;
  const sloan = calcSloanRatio(m);
  const netIncome5Y = sumNetIncome5Y(m);

  const grahamTests = [
    pass(m.revenue !== null ? m.revenue > 350_000_000 : null, "Revenue > 350M", "מכירות מעל 350M", "חסר/נכשל במכירות", 1),
    pass(m.currentRatio !== null ? m.currentRatio > 2 : null, "CR > 2", "יחס שוטף מעל 2", "יחס שוטף חסר/נמוך", 1),
    pass(m.workingCapital !== null && m.longTermDebt !== null ? m.workingCapital > m.longTermDebt : null, "Working Capital > LTD", "הון חוזר גדול מחוב ארוך", "הון חוזר לא מכסה LTD / חסר", 1),
    pass(m.pe !== null ? m.pe > 5 && m.pe < peMax : null, "P/E", `P/E בטווח 5-${peMax}`, "P/E חסר/לא בטווח", 1),
    pass(m.pe !== null && m.pb !== null ? m.pe * m.pb < 22 : null, "Graham Ratio", "P/E*P/B קטן מ־22", "יחס גרהאם חסר/גבוה", 1),
    pass(epsTotalGrowth !== null ? epsTotalGrowth > 0.30 : null, "EPS Total Growth", "צמיחת EPS כוללת מעל 30%", "צמיחת EPS כוללת חסרה/נמוכה", 1)
  ];

  const fisherCheapCount = [m.pe !== null && m.pe < peMax, m.pe !== null && m.pb !== null && m.pe * m.pb < 22, m.ps !== null && m.ps < 1.5].filter(Boolean).length;
  const fisherTests = [
    pass(fisherCheapCount >= 2, "2 מתוך 3 מכפילי זול", "זולה לפי לפחות 2 מכפילים", "לא זולה לפי 2 מכפילים", 2),
    pass(m.profitMargin !== null ? m.profitMargin > marginMin : null, "Profit Margin", `שולי רווח מעל ${(marginMin*100).toFixed(0)}%`, "שולי רווח חסרים/נמוכים", 1),
    pass(epsCagr !== null ? epsCagr > 0.15 : null, "EPS CAGR", "צמיחת EPS שנתית מעל 15%", "צמיחת EPS שנתית חסרה/נמוכה", 1),
    pass(m.debtEquity !== null ? m.debtEquity < 0.4 : null, "Debt/Equity < 40%", "חוב נמוך לפי פישר", "חוב חסר/גבוה", 1),
    pass(m.fcfPerShare !== null ? m.fcfPerShare > 0 : null, "FCF per share", "FCF למניה חיובי", "FCF למניה חסר/שלילי", 1)
  ];

  const cashTests = [
    pass(m.ocf !== null ? m.ocf > 0 : null, "OCF > 0", "תזרים שוטף חיובי", "OCF חסר/שלילי", 1),
    pass(m.icf !== null ? m.icf < 0 : null, "ICF < 0", "תזרים השקעה שלילי", "ICF חסר/לא שלילי", 1),
    pass(m.cff !== null ? m.cff < 0 : null, "CFF < 0", "תזרים מימון שלילי", "CFF חסר/לא שלילי", 1),
    pass(m.ocf !== null && m.netIncome !== null ? m.ocf >= m.netIncome : null, "OCF >= Net Income", "איכות רווח טובה", "OCF קטן מהרווח / חסר", 2),
    pass(m.fcf !== null ? m.fcf > 0 : null, "FCF > 0", "תזרים חופשי חיובי", "FCF חסר/שלילי", 1),
    pass(sloan !== null ? sloan >= -0.10 && sloan <= 0.10 : null, "Sloan Ratio", "Sloan בטווח תקין", "Sloan חסר/מחוץ לטווח", 1)
  ];

  const buffettTests = [
    pass(epsCagr !== null ? epsCagr > 0 : null, "EPS CAGR", "צמיחת EPS שנתית חיובית", "EPS CAGR חסר/שלילי", 1),
    pass(m.roe !== null ? m.roe > 0.15 : null, "ROE > 15%", "ROE גבוה", "ROE חסר/נמוך", 2),
    pass(m.roa !== null ? m.roa > 0.12 : null, "ROA > 12%", "ROA גבוה", "ROA חסר/נמוך", 1),
    pass(m.fcf !== null ? m.fcf > 0 : null, "FCF > 0", "FCF חיובי", "FCF חסר/שלילי", 1),
    pass(netIncome5Y !== null && m.longTermDebt !== null ? netIncome5Y > m.longTermDebt : null, "5Y NI > LTD", "רווחי 5 שנים מכסים חוב ארוך", "חסר/לא מכסה LTD", 2)
  ];

  const pi = computePiotroski(m);

  return {
    graham: scoreCategory(grahamTests),
    fisher: scoreCategory(fisherTests),
    cash: scoreCategory(cashTests),
    buffett: scoreCategory(buffettTests),
    piotroski: pi,
    dreman: { score: null, max: null, pct: null, tests: [] },
    neff: { score: null, max: null, pct: null, tests: [] },
    epsCagr,
    epsTotalGrowth,
    sloan,
    netIncome5Y
  };
}

function computePiotroski(m) {
  const income = m.raw.income || [];
  const cash = m.raw.cash || [];
  const balance = m.raw.balance || [];
  if (income.length < 2 || balance.length < 2) {
    return { score: null, max: 9, pct: null, tests: [] };
  }
  const y0 = { income: income[0] || {}, cash: cash[0] || {}, bal: balance[0] || {} };
  const y1 = { income: income[1] || {}, cash: cash[1] || {}, bal: balance[1] || {} };

  const ni0 = pickNum(y0.income, ["netIncome"]), ni1 = pickNum(y1.income, ["netIncome"]);
  const assets0 = pickNum(y0.bal, ["totalAssets"]), assets1 = pickNum(y1.bal, ["totalAssets"]);
  const roa0 = ni0 !== null && assets0 ? ni0 / assets0 : null;
  const roa1 = ni1 !== null && assets1 ? ni1 / assets1 : null;
  const ocf0 = pickNum(y0.cash, ["operatingCashFlow", "netCashProvidedByOperatingActivities"]);
  const ltd0 = pickNum(y0.bal, ["longTermDebt"]), ltd1 = pickNum(y1.bal, ["longTermDebt"]);
  const ca0 = pickNum(y0.bal, ["totalCurrentAssets"]), cl0 = pickNum(y0.bal, ["totalCurrentLiabilities"]);
  const ca1 = pickNum(y1.bal, ["totalCurrentAssets"]), cl1 = pickNum(y1.bal, ["totalCurrentLiabilities"]);
  const cr0 = ca0 !== null && cl0 ? ca0 / cl0 : null;
  const cr1 = ca1 !== null && cl1 ? ca1 / cl1 : null;
  const shares0 = pickNum(y0.bal, ["commonStockSharesOutstanding"]), shares1 = pickNum(y1.bal, ["commonStockSharesOutstanding"]);
  const rev0 = pickNum(y0.income, ["revenue"]), rev1 = pickNum(y1.income, ["revenue"]);
  const gp0 = pickNum(y0.income, ["grossProfit"]), gp1 = pickNum(y1.income, ["grossProfit"]);
  const gm0 = gp0 !== null && rev0 ? gp0 / rev0 : null;
  const gm1 = gp1 !== null && rev1 ? gp1 / rev1 : null;
  const at0 = rev0 !== null && assets0 ? rev0 / assets0 : null;
  const at1 = rev1 !== null && assets1 ? rev1 / assets1 : null;

  const tests = [
    pass(roa0 !== null ? roa0 > 0 : null, "ROA חיובי", "ROA חיובי", "ROA חסר/שלילי", 1),
    pass(roa0 !== null && roa1 !== null ? roa0 > roa1 : null, "ROA משתפר", "ROA משתפר", "ROA לא משתפר/חסר", 1),
    pass(ocf0 !== null ? ocf0 > 0 : null, "OCF חיובי", "OCF חיובי", "OCF חסר/שלילי", 1),
    pass(ocf0 !== null && ni0 !== null ? ocf0 >= ni0 : null, "OCF >= NI", "OCF >= Net Income", "OCF קטן מהרווח/חסר", 1),
    pass(ltd0 !== null && ltd1 !== null && assets0 && assets1 ? (ltd0/assets0) < (ltd1/assets1) : null, "ירידה במינוף", "חוב/נכסים ירד", "חוב/נכסים לא ירד/חסר", 1),
    pass(cr0 !== null && cr1 !== null ? cr0 > cr1 : null, "CR משתפר", "יחס שוטף השתפר", "יחס שוטף לא השתפר/חסר", 1),
    pass(shares0 !== null && shares1 !== null ? shares0 <= shares1 : null, "אין דילול", "אין דילול מניות", "יש דילול/חסר", 1),
    pass(gm0 !== null && gm1 !== null ? gm0 > gm1 : null, "Gross Margin משתפר", "שולי רווח גולמי השתפרו", "Gross Margin לא השתפר/חסר", 1),
    pass(at0 !== null && at1 !== null ? at0 > at1 : null, "Asset Turnover משתפר", "מחזור נכסים השתפר", "Asset Turnover לא השתפר/חסר", 1)
  ];

  const available = tests.filter(t => t.passed !== null);
  const score = available.reduce((s,t)=>s+t.points,0);
  return { score, max: 9, pct: Math.round((score/9)*100), tests };
}

function resolveRelativeBasis(row, rows) {
  const industryPeers = rows.filter(r => r !== row && r.m.industry && row.m.industry && r.m.industry === row.m.industry);
  if (industryPeers.length >= RELATIVE_MIN_PEERS) {
    return { type: "industry", label: "Industry peers in scanned list", peerCount: industryPeers.length, peerRows: industryPeers };
  }

  const sectorPeers = rows.filter(r => r !== row && r.m.sector && row.m.sector && r.m.sector === row.m.sector);
  if (sectorPeers.length >= RELATIVE_MIN_PEERS) {
    return { type: "sector", label: "Sector peers in scanned list", peerCount: sectorPeers.length, peerRows: sectorPeers };
  }

  const fallbackPeers = rows.filter(r => r !== row);
  return {
    type: "scanned",
    label: "Scanned list fallback",
    peerCount: fallbackPeers.length,
    peerRows: fallbackPeers
  };
}

function relativeReference(row, getter) {
  const basis = row.relativeBasis || resolveRelativeBasis(row, [row]);
  return positiveMean(basis.peerRows.map(getter));
}

function computeDreman(row, rows, settings) {
  const m = row.m;
  if (!row.relativeBasis) row.relativeBasis = resolveRelativeBasis(row, rows);
  const basisLabel = row.relativeBasis.label;
  const peAvg = relativeReference(row, r => r.m.pe);
  const pbAvg = relativeReference(row, r => r.m.pb);
  const pocf = priceToOperatingCashFlow(m);
  const pocfAvg = relativeReference(row, r => priceToOperatingCashFlow(r.m));
  const divAvg = relativeReference(row, r => r.m.dividendYield);

  const cheapTestsRaw = [
    m.pe !== null && peAvg !== null ? m.pe <= peAvg * 0.80 : null,
    m.pb !== null && pbAvg !== null ? m.pb <= pbAvg * 0.80 : null,
    pocf !== null && pocfAvg !== null ? pocf <= pocfAvg * 0.80 : null,
    m.dividendYield !== null && divAvg !== null ? m.dividendYield >= divAvg : null
  ];
  const availableCheapTests = cheapTestsRaw.filter(v => v !== null).length;
  const cheapCount = cheapTestsRaw.filter(Boolean).length;

  const tests = [
    pass(availableCheapTests ? cheapCount >= 2 : null, "2 מכפילים זולים יחסית", `לפחות 2 מכפילים זולים בכ־20% מול ${basisLabel}`, "לא מספיק זולה יחסית", 2),
    pass(m.marketCap !== null ? m.marketCap >= (m.isUsListed ? settings.marketCapUS : settings.marketCapDefault) : null, "Market Cap", "עוברת סף גודל", "שווי שוק נמוך/חסר", 1),
    pass(m.currentRatio !== null ? m.currentRatio > 2 : null, "CR > 2", "יחס שוטף מעל 2", "יחס שוטף חסר/נמוך", 1),
    pass(m.dividendYield !== null && divAvg !== null ? m.dividendYield >= divAvg : null, "Dividend Yield", `דיבידנד מעל ממוצע ${basisLabel}`, "דיבידנד נמוך/חסר", 1),
    pass(m.roe !== null ? m.roe > 0.10 : null, "ROE > 10%", "ROE מעל 10%", "ROE חסר/נמוך", 1),
    pass(m.debtEquity !== null ? m.debtEquity < 0.50 : null, "Debt/Equity", "חוב סביר עד 0.5", "חוב גבוה/חסר", 1),
    pass(row.value.epsCagr !== null ? row.value.epsCagr > 0 : null, "EPS CAGR", "צמיחת EPS שנתית חיובית", "צמיחת EPS שנתית חסרה/שלילית", 1)
  ];

  const result = scoreCategory(tests);
  result.reference = { peAvg, pbAvg, pocfAvg, divAvg, pocf, cheapCount, basis: basisLabel, peerCount: row.relativeBasis.peerCount };
  return result;
}

function computeNeff(row, rows) {
  const m = row.m;
  if (!row.relativeBasis) row.relativeBasis = resolveRelativeBasis(row, rows);
  const peAvg = relativeReference(row, r => r.m.pe);
  const epsCagr = row.value.epsCagr;
  const revGrowth = m.revenueGrowth;
  const divYield = m.dividendYield ?? 0;
  const totalReturnToPe = (epsCagr !== null && m.pe !== null && m.pe > 0) ? (((epsCagr + Math.max(divYield, 0)) * 100) / m.pe) : null;
  const revToEps = (revGrowth !== null && epsCagr !== null && Math.abs(epsCagr) > 0.0001) ? revGrowth / epsCagr : null;

  const tests = [
    pass(m.pe !== null && peAvg !== null ? m.pe <= peAvg * 0.60 : null, "P/E נמוך מאוד", `P/E נמוך בכ־40% לפחות מול ${row.relativeBasis.label}`, "P/E לא נמוך מספיק/חסר", 2),
    pass(epsCagr !== null ? epsCagr >= 0.07 && epsCagr <= 0.22 : null, "EPS CAGR 7%-22%", "צמיחה שנתית מתונה ובריאה", "צמיחה שנתית חסרה/מחוץ לטווח", 2),
    pass(revToEps !== null ? revToEps > 0.70 : null, "Revenue/EPS Growth", "הכנסות מגבות את צמיחת הרווח", "הצמיחה לא מגובה בהכנסות/חסר", 1),
    pass(m.fcf !== null ? m.fcf > 0 : null, "FCF > 0", "תזרים חופשי חיובי", "FCF חסר/שלילי", 1),
    pass(totalReturnToPe !== null ? totalReturnToPe >= 2 : null, "Total Return / P/E", "יחס נף מעל 2", "יחס נף חסר/נמוך", 1),
    pass(m.dividendYield !== null ? m.dividendYield >= 0.04 : null, "Dividend 4%+", "דיבידנד גבוה כסבלנות למשקיע", "דיבידנד נמוך/חסר", 1)
  ];

  const result = scoreCategory(tests);
  result.reference = { peAvg, epsCagr, revGrowth, revToEps, totalReturnToPe, basis: row.relativeBasis.label, peerCount: row.relativeBasis.peerCount };
  return result;
}

function recomputeTotalAndDecision(row, settings) {
  const categoryScores = [
    row.value.graham?.pct,
    row.value.fisher?.pct,
    row.value.cash?.pct,
    row.value.buffett?.pct,
    row.value.piotroski?.pct,
    row.value.dreman?.pct,
    row.value.neff?.pct
  ].filter(v => v !== null && v !== undefined);

  const valueAvg = categoryScores.length ? categoryScores.reduce((a,b)=>a+b,0) / categoryScores.length : 0;
  row.totalScore = Math.round((row.quick.score * 0.15) + (valueAvg * 0.85));

  row.decision = "reject";
  row.decisionText = "נפסלה";
  if (row.passBasic && row.dataConfidence.strongEnough && row.totalScore >= 75 && (row.value.cash.pct === null || row.value.cash.pct >= 60)) {
    row.decision = "strong";
    row.decisionText = "מועמדת חזקה";
  } else if (row.passBasic && row.totalScore >= 55) {
    row.decision = "watch";
    row.decisionText = "Watchlist";
  } else if (row.passBasic) {
    row.decision = "watch";
    row.decisionText = "בדיקה ידנית";
  }
}

function applyRelativeStrategies(rows, settings) {
  rows.forEach(row => {
    row.relativeBasis = resolveRelativeBasis(row, rows);
    row.value.dreman = computeDreman(row, rows, settings);
    row.value.neff = computeNeff(row, rows);
    recomputeTotalAndDecision(row, settings);
  });
}

function evaluateStock(raw, settings) {
  const m = buildMetrics(raw);
  const quick = computeQuickScore(m);
  const value = computeValueScores(m, settings);
  const dataConfidence = computeDataConfidence(m);
  const dcf = computeDcfEstimate(m, settings.dcf);
  if (raw.provider === "yahoo") {
    dcf.reasons.unshift("Yahoo Experimental provides quote-level data only; fundamentals needed for DCF are not available. Use FMP for DCF.");
  }

  const minCap = m.isUsListed ? settings.marketCapUS : settings.marketCapDefault;
  const passBasic =
    m.price !== null && m.price >= settings.priceMin &&
    m.volume !== null && m.volume >= settings.volumeMin &&
    m.marketCap !== null && m.marketCap >= minCap;

  const categoryScores = [
    value.graham.pct,
    value.fisher.pct,
    value.cash.pct,
    value.buffett.pct,
    value.piotroski.pct
  ].filter(v => v !== null);

  const valueAvg = categoryScores.length ? categoryScores.reduce((a,b)=>a+b,0) / categoryScores.length : 0;
  const totalScore = Math.round((quick.score * 0.20) + (valueAvg * 0.80));

  let decision = "reject";
  let decisionText = "נפסלה";
  if (passBasic && dataConfidence.strongEnough && totalScore >= 75 && (value.cash.pct === null || value.cash.pct >= 60)) {
    decision = "strong";
    decisionText = "מועמדת חזקה";
  } else if (passBasic && totalScore >= 55) {
    decision = "watch";
    decisionText = "Watchlist";
  } else if (passBasic) {
    decision = "watch";
    decisionText = "בדיקה ידנית";
  }

  return { raw, m, quick, value, dataConfidence, dcf, totalScore, passBasic, decision, decisionText };
}
