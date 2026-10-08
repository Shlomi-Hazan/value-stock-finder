// Value Stock Finder: Scan orchestration: request planning, Deep / Momentum / Two-stage scans, stop handling and endpoint tests.
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

// Stage 1-only fallback rows keep the preliminary evaluateStock() total (no relative strategies / final recompute).
function stageOnePreliminaryText(count) {
  if (!count) return "לא נאספו שורות Stage 1 לפני העצירה, ולכן אין תוצאות להצגה.";
  return `מוצגות ${count} שורות Preliminary (quote-level) של Stage 1 בלבד — אלה אינן תוצאות Deep Scan / ציון ערך סופי. ציון ערך מלא דורש Stage 2 (Deep Scan).`;
}

function estimateRequestPlan(symbols, mode) {
  const endpoints = endpointsForMode(mode);
  let cached = 0;
  symbols.forEach(symbol => {
    endpoints.forEach(endpoint => {
      if (readCachedFmp(endpoint.path, symbol, endpoint.extra)) cached++;
    });
  });
  const total = symbols.length * endpoints.length;
  return { total, cached, api: total - cached, endpoints: endpoints.length };
}

function readTwoStageSettings(writeBack = false) {
  return {
    maxSymbols: clampIntInput("twoStageMaxSymbols", TWO_STAGE_DEFAULT_MAX_SYMBOLS, 1, TWO_STAGE_MAX_SYMBOLS_LIMIT, writeBack),
    topN: clampIntInput("twoStageTopN", TWO_STAGE_DEFAULT_TOP_N, 1, TWO_STAGE_TOP_N_LIMIT, writeBack)
  };
}

// Stage 2 reuses the Stage 1 quote from cache, so only the deep endpoints are counted for it.
// Which symbols reach Stage 2 is unknown until Stage 1 ranks them, so Stage 2 is an upper bound before cache.
function estimateTwoStagePlan(symbols) {
  const { maxSymbols, topN } = readTwoStageSettings();
  const stage1Symbols = symbols.slice(0, maxSymbols);
  const stage1Cached = stage1Symbols.filter(symbol => readCachedFmp("/stable/quote", symbol, {})).length;
  const candidates = Math.min(topN, stage1Symbols.length);
  const stage2Max = candidates * DEEP_ENDPOINTS.length;
  return {
    inputCount: symbols.length,
    stage1Count: stage1Symbols.length,
    stage1Cached,
    stage1Api: stage1Symbols.length - stage1Cached,
    candidates,
    deepEndpoints: DEEP_ENDPOINTS.length,
    stage2Max,
    maxBeforeCache: stage1Symbols.length + stage2Max,
    maxWithQuoteCache: stage1Symbols.length - stage1Cached + stage2Max
  };
}

function requestStopScan() {
  stopRequested = true;
  setStatus("בקשת עצירה התקבלה. הסריקה תיעצר לפני הסימול הבא.", "warn");
}

async function scanStocks() {
  const apiKey = document.getElementById("apiKey").value.trim();
  const symbols = parseSymbols(document.getElementById("symbolsInput").value);
  const mode = document.getElementById("scanMode").value;
  const provider = getSelectedProvider();
  const button = document.getElementById("scanButton");
  const stopButton = document.getElementById("stopButton");
  const settings = {
    topLimit: Number(document.getElementById("topLimit").value || 15),
    marketCapUS: Number(document.getElementById("marketCapUS").value || 2_000_000_000),
    marketCapDefault: Number(document.getElementById("marketCapDefault").value || 1_000_000_000),
    volumeMin: Number(document.getElementById("volumeMin").value || 0),
    priceMin: Number(document.getElementById("priceMin").value || 0),
    dcf: {
      discountRate: parsePercentInput("dcfDiscountRate", 10),
      terminalGrowth: parsePercentInput("dcfTerminalGrowth", 2.5),
      projectionYears: Math.round(clamp(numberOrNull(document.getElementById("dcfProjectionYears").value) ?? 5, 1, 10)),
      marginSafetyRequirement: parsePercentInput("dcfMarginSafety", 25)
    }
  };

  // Safer option: block Deep Scan / Two-stage for Yahoo instead of silently downgrading, so no request is made.
  if (!PROVIDERS[provider].supportsDeep && mode !== "quick") {
    const blockedMessage = mode === "twoStage" ? YAHOO_TWO_STAGE_BLOCKED_MESSAGE : YAHOO_DEEP_BLOCKED_MESSAGE;
    setStatus(blockedMessage + " (בחר מצב Momentum / Market או ספק FMP)", "warn");
    updateRequestPreview();
    return;
  }
  if (PROVIDERS[provider].needsApiKey && !apiKey) { setStatus("חסר API Key", "bad"); return; }
  if (!symbols.length) { setStatus("חסרה רשימת מניות", "bad"); return; }

  const plan = estimateRequestPlan(symbols, mode);
  updateRequestPreview();
  if (provider === "fmp" && mode === "deep" && symbols.length > 10) {
    const ok = confirm(`Deep Scan על ${symbols.length} סימולים עשוי לבצע עד ${plan.total} קריאות (${plan.api} אחרי Cache נוכחי). להמשיך?`);
    if (!ok) {
      setStatus("הסריקה בוטלה לפני ביצוע קריאות API", "warn");
      return;
    }
  }
  if (mode === "twoStage") {
    readTwoStageSettings(true);
    const twoStagePlan = estimateTwoStagePlan(symbols);
    updateRequestPreview();
    if (twoStagePlan.maxWithQuoteCache > TWO_STAGE_CONFIRM_CALLS) {
      const ok = confirm(`Two-stage scan: Stage 1 עד ${twoStagePlan.stage1Count} קריאות quote (${twoStagePlan.stage1Api} אחרי Cache נוכחי), Stage 2 עד ${twoStagePlan.stage2Max} קריאות Deep. להמשיך?`);
      if (!ok) {
        setStatus("הסריקה בוטלה לפני ביצוע קריאות API", "warn");
        return;
      }
    }
  }

  if (apiKey) localStorage.setItem("valueStockFinderApiKey", apiKey);
  resetResults();
  lastScanStats.mode = mode;
  stopRequested = false;
  button.disabled = true;
  stopButton.disabled = false;
  document.getElementById("endpointStatus").innerHTML = "";
  const evaluated = [];

  try {
    if (mode === "twoStage") {
      await runTwoStageScan(symbols, apiKey, provider, settings);
      return;
    }
    for (let i = 0; i < symbols.length; i++) {
      if (stopRequested) {
        lastScanStats.stopped = true;
        break;
      }
      const symbol = symbols[i];
      setStatus(`בודק ${i + 1}/${symbols.length}: ${symbol} (${providerLabel(provider)})`, "");
      const raw = await fetchStockDataByProvider(symbol, apiKey, mode, provider);
      lastScanStats.checked++;
      lastScanStats.apiCalls += raw.apiCalls || 0;
      lastScanStats.cacheHits += raw.cacheHits || 0;
      if (raw.quote) evaluated.push(evaluateStock(raw, settings));
      await sleep(mode === "deep" ? 120 : 60);
    }

    applyRelativeStrategies(evaluated, settings);

    allResults = evaluated.sort((a,b)=>b.totalScore-a.totalScore);
    lastResults = allResults.slice(0, settings.topLimit);

    renderTable();
    updateSummary();
    const stopText = lastScanStats.stopped ? " הסריקה נעצרה לפי בקשתך." : "";
    const providerText = provider === "yahoo" ? " Yahoo Experimental / Browser test only: quote-level only, ללא DCF/דוחות. אינו תחליף אמין ל־FMP." : "";
    setStatus(`הסריקה הסתיימה.${providerText} נבדקו ${lastScanStats.checked} סימולים ונמצאו נתונים עבור ${evaluated.length} מניות. API: ${lastScanStats.apiCalls}, Cache: ${lastScanStats.cacheHits}.${stopText}`, lastScanStats.stopped ? "warn" : "good");
  } catch (e) {
    console.error(e);
    if (e.rateLimited) {
      if (evaluated.length) {
        applyRelativeStrategies(evaluated, settings);
        allResults = evaluated.sort((a,b)=>b.totalScore-a.totalScore);
        lastResults = allResults.slice(0, settings.topLimit);
        renderTable();
        updateSummary();
      } else {
        document.getElementById("stocksTable").innerHTML = `<tr><td colspan="36">לא נאספו תוצאות לפני מגבלת ה־API</td></tr>`;
      }
      setStatus((e.message || "הגעת למגבלת הבקשות של FMP.") + ` מוצגות ${evaluated.length} תוצאות שנאספו לפני העצירה. נסה שוב מאוחר יותר או השתמש ב־Cache קיים.`, "warn");
    } else if (e.providerBlocked) {
      if (evaluated.length) {
        applyRelativeStrategies(evaluated, settings);
        allResults = evaluated.sort((a,b)=>b.totalScore-a.totalScore);
        lastResults = allResults.slice(0, settings.topLimit);
        renderTable();
        updateSummary();
      } else {
        document.getElementById("stocksTable").innerHTML = `<tr><td colspan="36">Yahoo Experimental לא החזיר נתונים. השתמש ב־FMP.</td></tr>`;
      }
      setStatus(`${e.message} הסריקה נעצרה כדי לא לחזור על בקשות שנחסמו (${e.detail || ""}). השתמש ב־FMP.`, "bad");
    } else {
      setStatus(e.message || "אירעה שגיאה", "bad");
      document.getElementById("stocksTable").innerHTML = `<tr><td colspan="36">אירעה שגיאה</td></tr>`;
    }
  } finally {
    button.disabled = false;
    stopButton.disabled = true;
    stopRequested = false;
    updateRequestPreview();
  }
}

// Practical candidate ordering for Two-stage scan, not an investment methodology.
// Stage 1 has quote-level data only, so it reuses existing outputs in this order: basic filter pass,
// total score, Momentum / Market score, Data Confidence, then symbol for a stable tie-break.
// Missing fundamentals are never treated as passing; they simply are not part of Stage 1.
function rankStageOneCandidates(rows) {
  const ranked = rows.slice().sort((a, b) =>
    (Number(b.passBasic) - Number(a.passBasic)) ||
    (b.totalScore - a.totalScore) ||
    (b.quick.score - a.quick.score) ||
    (b.dataConfidence.pct - a.dataConfidence.pct) ||
    String(a.m.symbol).localeCompare(String(b.m.symbol))
  );
  ranked.forEach((row, index) => {
    row.scanMeta = { mode: "twoStage", stage: 1, stage1Rank: index + 1, stage1Total: ranked.length };
  });
  return ranked;
}

// Deep rows get relative strategies and the usual total-score sort. Preliminary Stage 1 rows keep the
// Stage 1 order and skip relative strategies, which would otherwise score Dreman on market cap alone.
function showTwoStageResults(rows, settings, isDeep) {
  if (lastScanStats.twoStage) lastScanStats.twoStage.preliminaryOnly = !isDeep && rows.length > 0;
  if (isDeep) {
    applyRelativeStrategies(rows, settings);
    allResults = rows.slice().sort((a,b)=>b.totalScore-a.totalScore);
  } else {
    allResults = rows.slice();
  }
  lastResults = allResults.slice(0, settings.topLimit);
  if (lastResults.length) {
    renderTable();
  } else {
    document.getElementById("stocksTable").innerHTML = `<tr><td colspan="36">לא נאספו תוצאות</td></tr>`;
  }
  updateSummary();
}

async function runTwoStageScan(symbols, apiKey, provider, settings) {
  const { maxSymbols, topN } = readTwoStageSettings();
  const stage1Symbols = symbols.slice(0, maxSymbols);
  const stats = {
    inputCount: symbols.length,
    stage1Total: stage1Symbols.length,
    stage1Checked: 0,
    topN,
    candidatesSelected: 0,
    stage2Total: 0,
    stage2Scanned: 0
  };
  lastScanStats.twoStage = stats;
  const stage1Rows = [];
  const stage2Rows = [];
  let ranked = null;
  let stage = 1;

  const countRaw = raw => {
    lastScanStats.apiCalls += raw.apiCalls || 0;
    lastScanStats.cacheHits += raw.cacheHits || 0;
  };
  const callsText = () => `API: ${lastScanStats.apiCalls}, Cache: ${lastScanStats.cacheHits}.`;

  try {
    // Stage 1: the same quote-only path as Momentum / Market. No deep endpoints are called here.
    for (let i = 0; i < stage1Symbols.length; i++) {
      if (stopRequested) {
        lastScanStats.stopped = true;
        break;
      }
      const symbol = stage1Symbols[i];
      setStatus(`Stage 1 (quote-level): בודק ${i + 1}/${stage1Symbols.length}: ${symbol}`, "");
      const raw = await fetchStockDataByProvider(symbol, apiKey, "quick", provider);
      stats.stage1Checked++;
      lastScanStats.checked++;
      countRaw(raw);
      if (raw.quote) stage1Rows.push(evaluateStock(raw, settings));
      await sleep(60);
    }

    ranked = rankStageOneCandidates(stage1Rows);
    if (lastScanStats.stopped || stopRequested) {
      lastScanStats.stopped = true;
      showTwoStageResults(ranked, settings, false);
      setStatus(`הסריקה נעצרה לפי בקשתך במהלך Stage 1, ולכן Stage 2 (Deep Scan) לא הורץ. ${stageOnePreliminaryText(ranked.length)} ${callsText()}`, "warn");
      return;
    }

    const candidates = ranked.filter(row => row.passBasic).slice(0, topN);
    stats.candidatesSelected = candidates.length;
    if (!candidates.length) {
      showTwoStageResults(ranked, settings, false);
      setStatus(`Stage 1 הסתיים: נבדקו ${stats.stage1Checked} סימולים, אך אף מניה לא עברה את הסינון הבסיסי (מחיר / Volume / Market Cap), ולכן Stage 2 לא הורץ. ${stageOnePreliminaryText(ranked.length)} ${callsText()}`, "warn");
      return;
    }

    // Stage 2: full FMP Deep Scan, only for the selected candidates.
    stage = 2;
    stats.stage2Total = candidates.length;
    for (let i = 0; i < candidates.length; i++) {
      if (stopRequested) {
        lastScanStats.stopped = true;
        break;
      }
      const candidate = candidates[i];
      const symbol = candidate.raw.symbol;
      setStatus(`Stage 2 (Deep Scan): ${i + 1}/${candidates.length}: ${symbol} (Stage 1 #${candidate.scanMeta.stage1Rank})`, "");
      const raw = await fetchStockDataByProvider(symbol, apiKey, "deep", provider);
      stats.stage2Scanned++;
      countRaw(raw);
      if (raw.quote) {
        const row = evaluateStock(raw, settings);
        row.scanMeta = { mode: "twoStage", stage: 2, stage1Rank: candidate.scanMeta.stage1Rank, stage1Total: ranked.length };
        stage2Rows.push(row);
      }
      await sleep(120);
    }

    if (lastScanStats.stopped && !stage2Rows.length) {
      showTwoStageResults(ranked, settings, false);
      setStatus(`הסריקה נעצרה לפי בקשתך לפני שהושלם Deep Scan למועמדת כלשהי, ולכן Stage 2 לא הושלם. ${stageOnePreliminaryText(ranked.length)} ${callsText()}`, "warn");
      return;
    }
    showTwoStageResults(stage2Rows, settings, true);
    const stopText = lastScanStats.stopped ? ` הסריקה נעצרה לפי בקשתך במהלך Stage 2 (בוצע Deep Scan ל־${stats.stage2Scanned}/${stats.stage2Total}).` : "";
    setStatus(`Two-stage scan הסתיים. Stage 1: נבדקו ${stats.stage1Checked}/${stats.stage1Total} סימולים ברמת quote, ונבחרו ${stats.candidatesSelected} מועמדות. Stage 2: בוצע Deep Scan ל־${stats.stage2Scanned} מניות, ומוצגות תוצאות ה־Deep בלבד. ${callsText()}${stopText}`, lastScanStats.stopped ? "warn" : "good");
  } catch (e) {
    if (!e.rateLimited && !e.providerBlocked) throw e;
    console.error(e);
    stats.haltedAtStage = stage;
    if (stage === 2 && stage2Rows.length) {
      showTwoStageResults(stage2Rows, settings, true);
      setStatus(`${e.message} (Stage 2). מוצגות ${stage2Rows.length} תוצאות Deep שנאספו לפני העצירה. ${callsText()} נסה שוב מאוחר יותר או השתמש ב־Cache קיים.`, "warn");
    } else {
      const preliminary = ranked || rankStageOneCandidates(stage1Rows);
      showTwoStageResults(preliminary, settings, false);
      setStatus(`${e.message} (Stage ${stage}). Stage 2 (Deep Scan) לא הושלם. ${stageOnePreliminaryText(preliminary.length)} ${callsText()} נסה שוב מאוחר יותר, הקטן את Top N או השתמש ב־Cache קיים.`, "warn");
    }
  }
}

async function testEndpoints() {
  const apiKey = document.getElementById("apiKey").value.trim();
  if (!apiKey) { setStatus("חסר API Key", "bad"); return; }
  localStorage.setItem("valueStockFinderApiKey", apiKey);

  const endpoints = endpointsForMode("deep");

  setStatus("בודק endpoints על AAPL...", "");
  const results = [];
  try {
    for (const endpoint of endpoints) {
      const extra = endpoint.path === "/stable/quote" ? {} : { ...endpoint.extra, limit: "1" };
      const res = await safeCall(endpoint.path, "AAPL", apiKey, extra);
      if (res.rateLimited) throw rateLimitError(res.detail || res.error);
      results.push(`<span class="pill ${res.ok ? "good" : "bad"}">${escapeHtml(endpoint.label)}: ${res.ok ? "עובד" : "חסום/שגיאה"}${res.ok ? " / " + escapeHtml(res.source) : ""}</span>`);
      document.getElementById("endpointStatus").innerHTML = results.join(" ");
      await sleep(80);
    }
    setStatus("בדיקת endpoints הסתיימה", "good");
  } catch (e) {
    setStatus(e.rateLimited ? e.message : (e.message || "בדיקת endpoints נכשלה"), "bad");
  }
}

// Single quote request for the selected provider, on demand only.
async function testSelectedProvider() {
  const provider = getSelectedProvider();
  const label = providerLabel(provider);
  const apiKey = document.getElementById("apiKey").value.trim();
  const statusEl = document.getElementById("endpointStatus");
  if (PROVIDERS[provider].needsApiKey && !apiKey) { setStatus("חסר API Key", "bad"); return; }
  if (apiKey) localStorage.setItem("valueStockFinderApiKey", apiKey);

  setStatus(`בודק את ${label} על AAPL...`, "");
  try {
    const res = await fetchQuoteData(provider, "AAPL", apiKey);
    const price = numberOrNull(res.data?.price);
    if (price === null) throw new Error(provider === "yahoo" ? YAHOO_FAILED_MESSAGE : "Quote ריק");
    statusEl.innerHTML = `<span class="pill good">${escapeHtml(label)}: Quote עובד / ${escapeHtml(res.source)} — AAPL ${formatMoney(price)}</span>`;
    setStatus(`בדיקת ${label} הצליחה`, "good");
  } catch (e) {
    const detail = e.detail ? ` (${e.detail})` : "";
    statusEl.innerHTML = `<span class="pill bad">${escapeHtml(label)}: חסום/שגיאה</span>`;
    setStatus((e.message || "הבדיקה נכשלה") + detail, "bad");
  }
}
