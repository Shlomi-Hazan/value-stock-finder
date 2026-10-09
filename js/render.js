// Value Stock Finder: Rendering: status line, request preview, pills, table, row details, tabs and summary.
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

function setStatus(message, type = "") {
  const el = document.getElementById("status");
  el.className = "status" + (type ? " " + type : "");
  el.textContent = message;
}

function twoStagePreviewText(symbols) {
  const plan = estimateTwoStagePlan(symbols);
  const skipped = plan.inputCount > plan.stage1Count
    ? `\nרק ${plan.stage1Count} הסימולים הראשונים מתוך ${plan.inputCount} ייבדקו ב־Stage 1 (לפי Stage 1 max symbols).`
    : "";
  return `Two-stage scan — Quick filter first, then Deep Scan top candidates (${providerLabel("fmp")}):` +
    `\nStage 1: up to ${plan.stage1Count} quote calls (לפי ה־Cache הנוכחי: כ־${plan.stage1Api} API וכ־${plan.stage1Cached} מה־Cache).` +
    `\nStage 2: up to ${plan.candidates} candidates × ${plan.deepEndpoints} deep endpoints = up to ${plan.stage2Max} calls (ה־Quote נלקח מה־Cache של Stage 1).` +
    `\nEstimated max before cache: ${plan.maxBeforeCache} calls. Cache may reduce this.` +
    skipped +
    `\n⚠️ ${TWO_STAGE_WARNING}`;
}

function updateRequestPreview() {
  const el = document.getElementById("requestPreview");
  if (!el) return;
  const symbols = parseSymbols(document.getElementById("symbolsInput")?.value || "");
  const mode = document.getElementById("scanMode")?.value || "deep";
  const provider = getSelectedProvider();
  if (!symbols.length) {
    el.textContent = "הערכת בקשות תופיע אחרי הזנת סימולים.";
    return;
  }
  if (provider === "yahoo" && mode === "twoStage") {
    el.textContent = `⚠️ ${YAHOO_TWO_STAGE_BLOCKED_MESSAGE} בחר ספק FMP, או מצב Momentum / Market לבדיקת Yahoo.`;
    return;
  }
  if (mode === "twoStage") {
    el.textContent = twoStagePreviewText(symbols);
    return;
  }
  if (provider === "yahoo") {
    const cached = symbols.filter(symbol => readCachedYahoo(symbol)).length;
    const deepNote = mode === "deep" ? " ⚠️ Deep Scan חסום עם Yahoo — עבור ל־Momentum / Market." : "";
    el.textContent = `Yahoo Experimental / Browser test only: quote-level scan only. Up to ${symbols.length} quote requests (כ־${symbols.length - cached} בקשות וכ־${cached} מה־Cache). Browser/CORS may block these requests. This is not a reliable replacement for FMP. Deep Scan / DCF requires FMP.${deepNote}`;
    return;
  }
  const plan = estimateRequestPlan(symbols, mode);
  const modeLabel = mode === "quick" ? "Momentum / Market" : "Deep Scan";
  const warning = mode === "deep" && symbols.length > 10 ? " מומלץ לצמצם רשימה, להסתמך על Cache או להשתמש ב־Two-stage scan." : "";
  el.textContent = `${providerLabel(provider)} — ${modeLabel}: עד ${plan.total} קריאות (${plan.endpoints} לכל סימול). לפי ה־Cache הנוכחי: כ־${plan.api} API וכ־${plan.cached} מה־Cache.${warning}`;
}

function formatDividend(m) {
  const amount = numberOrNull(m.dividendAmount);
  const yieldValue = numberOrNull(m.dividendYield);

  if ((amount === null || amount <= 0) && (yieldValue === null || yieldValue <= 0)) {
    return `<span class="pill gray">לא / חסר</span>`;
  }

  const parts = [];

  if (amount !== null && amount > 0) {
    parts.push(`$${amount.toFixed(2)}`);
  }

  if (yieldValue !== null && yieldValue > 0) {
    const pct = Math.abs(yieldValue) <= 1 ? yieldValue * 100 : yieldValue;
    parts.push(`${pct.toFixed(2)}%`);
  }

  return `<span class="pill good">כן</span><br><span class="small">${parts.join(" / ")}</span>`;
}

function categoryPill(cat) {
  if (cat === null || cat === undefined) return `<span class="pill gray">חסר</span>`;
  let cls = cat >= 75 ? "good" : cat >= 50 ? "warn" : "bad";
  return `<span class="pill ${cls}">${cat}%</span>`;
}

function decisionPill(row) {
  if (row.decision === "strong") return `<span class="pill good">${escapeHtml(row.decisionText)}</span>`;
  if (row.decision === "watch") return `<span class="pill warn">${escapeHtml(row.decisionText)}</span>`;
  return `<span class="pill bad">${escapeHtml(row.decisionText)}</span>`;
}

function testListHtml(cat) {
  if (!cat || !cat.tests || !cat.tests.length) return "<li>חסר מידע</li>";
  return cat.tests.map(t => `<li>${t.passed ? "✅" : t.passed === null ? "⚪" : "❌"} ${escapeHtml(t.label)}: ${escapeHtml(t.text)}</li>`).join("");
}

function confidencePill(confidence) {
  if (!confidence) return `<span class="pill gray">חסר</span>`;
  const cls = confidence.pct >= 80 ? "good" : confidence.pct >= DATA_CONFIDENCE_STRONG_MIN ? "warn" : "bad";
  return `<span class="pill ${cls}">${confidence.pct}%</span><br><span class="small">${confidence.available}/${confidence.total}</span>`;
}

function dataSourcePill(row) {
  const api = row.raw.apiCalls || 0;
  const cache = row.raw.cacheHits || 0;
  const providerNote = row.raw.provider === "yahoo" ? `<br><span class="pill warn">Yahoo Experimental / Browser test only</span>` : "";
  const notes = providerNote + twoStagePill(row);
  if (api > 0 && cache > 0) return `<span class="pill info">מעורב</span><br><span class="small">API ${api} / Cache ${cache}</span>${notes}`;
  if (cache > 0) return `<span class="pill good">Cache</span><br><span class="small">${cache} קריאות</span>${notes}`;
  if (api > 0) return `<span class="pill warn">API</span><br><span class="small">${api} קריאות</span>${notes}`;
  return `<span class="pill gray">אין</span>${notes}`;
}

function twoStagePill(row) {
  const meta = row.scanMeta;
  if (!meta || meta.mode !== "twoStage") return "";
  if (meta.stage === 2) return `<br><span class="pill info">Two-stage: Deep</span><br><span class="small">Stage 1 #${meta.stage1Rank}</span>`;
  return `<br><span class="pill gray">Stage 1 בלבד (quote)</span><br><span class="small">Preliminary</span>`;
}

function twoStageDetailsHtml(row) {
  const meta = row.scanMeta;
  if (!meta || meta.mode !== "twoStage") return "";
  if (meta.stage === 2) {
    return `<b>Two-stage scan:</b> מועמדת #${meta.stage1Rank} מתוך ${meta.stage1Total} ב־Stage 1 (סידור לפי נתוני quote בלבד), ולאחר מכן בוצע לה Deep Scan מלא ב־Stage 2.<br/>`;
  }
  return `<b>Two-stage scan — Preliminary (quote-level):</b> שורת Stage 1 בלבד (#${meta.stage1Rank} מתוך ${meta.stage1Total}). Stage 2 (Deep Scan) לא רץ או לא הושלם עבורה, ולכן אין דוחות כספיים, השוואה יחסית או DCF. הציון הכולל כאן הוא ציון ביניים ולא ציון ערך סופי.<br/>`;
}

function relativeBasisCell(row) {
  const basis = row.relativeBasis;
  if (!basis) return `<span class="pill gray">Relative basis:<br>Scanned list fallback</span>`;
  const cls = basis.type === "industry" ? "good" : basis.type === "sector" ? "info" : "warn";
  return `<span class="pill ${cls}">Relative basis:<br>${escapeHtml(basis.label)}</span><br><span class="small">${basis.peerCount} peers</span>`;
}

function dcfMissingCell() {
  return `<span class="muted">חסר נתון</span>`;
}

function dcfConfidencePill(dcf) {
  if (!dcf) return `<span class="pill gray">Not enough data</span>`;
  const cls = dcf.calculable && dcf.confidencePct >= 80 ? "good" : dcf.confidencePct >= 50 ? "warn" : "bad";
  const label = dcf.calculable ? `${dcf.confidencePct}%` : "Not enough data";
  return `<span class="pill ${cls}">${label}</span><br><span class="small">${dcf.confidenceScore}/${dcf.confidenceMax}</span>`;
}

function dcfMarginCell(dcf) {
  if (!dcf || dcf.marginPassed === null) return dcfMissingCell();
  const cls = dcf.marginPassed ? "good" : "warn";
  const label = dcf.marginPassed ? "עובר" : "לא עובר";
  return `<span class="pill ${cls}">${label}</span><br>${formatPercentValue(dcf.marginOfSafetyPct, true)}<br><span class="small">${formatPercentValue(dcf.marginSafetyRequirement, true)} נדרש</span>`;
}

function dcfDetailsHtml(dcf) {
  if (!dcf) return "<li>Not enough data</li>";
  const reasonList = dcf.reasons.length ? dcf.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("") : "<li>DCF calculated with available assumptions.</li>";
  return `
    <li>Base FCF used: ${dcf.baseFcf === null ? "חסר נתון" : formatNumber(dcf.baseFcf)} (${escapeHtml(dcf.baseFcfSource)})</li>
    <li>Latest FCF: ${dcf.latestFcf === null ? "חסר נתון" : formatNumber(dcf.latestFcf)}</li>
    <li>Growth rate used: ${formatPercentValue(dcf.growthRate, true)} (${escapeHtml(dcf.growthSource)})</li>
    <li>Discount rate: ${formatPercentValue(dcf.discountRate, true)}</li>
    <li>Terminal growth: ${formatPercentValue(dcf.terminalGrowth, true)}</li>
    <li>Projection years: ${dcf.projectionYears}</li>
    <li>Shares used: ${dcf.shares === null ? "חסר נתון" : formatNumber(dcf.shares)}</li>
    <li>Why DCF passed/failed:<ul>${reasonList}</ul></li>
  `;
}

// Rows currently shown in the table, so a details button can find its row (declaration only, no load-time code).
let detailsRows = [];
let detailsOpener = null;

// Table cell: a compact button. The details themselves open in the #detailsDialog modal (PR #12),
// not inside the narrow, horizontally scrolling table cell.
function renderDetails(row, index) {
  return `<button type="button" class="details-open" onclick="openRowDetails(${index})" aria-haspopup="dialog">פתח פירוט</button>`;
}

function detailsItemsHtml(items) {
  return items.map(x => `<li>${escapeHtml(x)}</li>`).join("");
}

function detailsMetricHtml(label, valueHtml) {
  return `<div class="dd-metric"><dt>${label}</dt><dd>${valueHtml}</dd></div>`;
}

function detailsStrategyHtml(title, cat, pillHtml) {
  return `<article class="dd-strategy"><header><h4>${title}</h4>${pillHtml}</header><ul>${testListHtml(cat)}</ul></article>`;
}

// Same information as the former inline details, regrouped into sections. Every dynamic string is escaped.
function detailsDialogBodyHtml(row) {
  const m = row.m;
  const errors = row.raw.endpointErrors || [];
  const sources = row.raw.endpointSources || [];
  const missing = row.dataConfidence?.missing || [];
  const coreMissing = row.dataConfidence?.coreMissing || [];
  const piotroskiPill = row.value.piotroski.score === null
    ? `<span class="pill gray">חסר</span>`
    : `<span class="pill ${row.value.piotroski.score >= 7 ? "good" : row.value.piotroski.score >= 5 ? "warn" : "bad"}">${row.value.piotroski.score}/9</span>`;

  return `
    <section class="dd-section">
      <h3>סיכום</h3>
      ${twoStageDetailsHtml(row) ? `<p class="dd-note">${twoStageDetailsHtml(row)}</p>` : ""}
      <dl class="dd-metrics">
        ${detailsMetricHtml("סקטור", escapeHtml(m.sector || m.industry || "-"))}
        ${detailsMetricHtml("מחיר", `<span class="num">${formatMoney(m.price)}</span>`)}
        ${detailsMetricHtml("שינוי", `<span class="num">${formatPercentValue(m.changePercentage, false)}</span>`)}
        ${detailsMetricHtml("Market Cap", `<span class="num">${formatNumber(m.marketCap)}</span>`)}
        ${detailsMetricHtml("P/E", `<span class="num">${formatRatio(m.pe)}</span>`)}
        ${detailsMetricHtml("P/B", `<span class="num">${formatRatio(m.pb)}</span>`)}
        ${detailsMetricHtml("ROE", `<span class="num">${formatPercentValue(m.roe, true)}</span>`)}
        ${detailsMetricHtml("Debt/Equity", `<span class="num">${formatRatio(m.debtEquity)}</span>`)}
        ${detailsMetricHtml("Current Ratio", `<span class="num">${formatRatio(m.currentRatio)}</span>`)}
        ${detailsMetricHtml("FCF", `<span class="num">${formatNumber(m.fcf)}</span>`)}
        ${detailsMetricHtml("דיבידנד", formatDividend(m))}
        ${detailsMetricHtml("Momentum / Market", categoryPill(row.quick.score))}
      </dl>
      <p class="dd-note"><b>Momentum / Market:</b> ${row.quick.notes.map(escapeHtml).join(", ") || "אין"}</p>
    </section>

    <section class="dd-section">
      <h3>Estimated Fair Value / DCF Estimate</h3>
      <dl class="dd-metrics">
        ${detailsMetricHtml("Fair Value", `<span class="num">${row.dcf?.fairValuePerShare === null ? dcfMissingCell() : formatMoney(row.dcf.fairValuePerShare)}</span>`)}
        ${detailsMetricHtml("Upside to Fair Value", `<span class="num">${row.dcf?.upsidePct === null ? dcfMissingCell() : formatPercentValue(row.dcf.upsidePct, true)}</span>`)}
        ${detailsMetricHtml("Discount from Fair Value", `<span class="num">${row.dcf?.discountFromFairValuePct === null ? dcfMissingCell() : formatPercentValue(row.dcf.discountFromFairValuePct, true)}</span>`)}
        ${detailsMetricHtml("Margin of Safety", dcfMarginCell(row.dcf))}
        ${detailsMetricHtml("DCF Confidence", dcfConfidencePill(row.dcf))}
      </dl>
      <ul class="dd-list">${dcfDetailsHtml(row.dcf)}</ul>
    </section>

    <section class="dd-section">
      <h3>Data Confidence</h3>
      <p class="dd-note">${confidencePill(row.dataConfidence)} <span>${row.dataConfidence?.pct ?? 0}% (${row.dataConfidence?.available ?? 0}/${row.dataConfidence?.total ?? 0})</span></p>
      ${coreMissing.length ? `<p class="dd-subtitle">שדות ליבה חסרים</p><ul class="dd-list">${detailsItemsHtml(coreMissing)}</ul>` : ""}
      ${missing.length ? `<p class="dd-subtitle">שדות חסרים</p><ul class="dd-list dd-list-cols">${detailsItemsHtml(missing.slice(0, 10))}</ul>` : ""}
    </section>

    <section class="dd-section">
      <h3>בדיקות אסטרטגיה</h3>
      <p class="dd-note"><b>Relative basis:</b> ${escapeHtml(row.relativeBasis?.label || "Scanned list fallback")} (${row.relativeBasis?.peerCount ?? 0} peers)</p>
      <div class="dd-strategies">
        ${detailsStrategyHtml("Graham", row.value.graham, categoryPill(row.value.graham.pct))}
        ${detailsStrategyHtml("Fisher", row.value.fisher, categoryPill(row.value.fisher.pct))}
        ${detailsStrategyHtml("Cash Flow", row.value.cash, categoryPill(row.value.cash.pct))}
        ${detailsStrategyHtml("Buffett Inspired", row.value.buffett, categoryPill(row.value.buffett.pct))}
        ${detailsStrategyHtml("Piotroski Approx.", row.value.piotroski, piotroskiPill)}
        ${detailsStrategyHtml("Dreman Inspired / Relative", row.value.dreman, categoryPill(row.value.dreman?.pct))}
        ${detailsStrategyHtml("Neff Inspired / Relative", row.value.neff, categoryPill(row.value.neff?.pct))}
      </div>
    </section>

    <section class="dd-section">
      <h3>מקור נתונים ומגבלות</h3>
      ${sources.length ? `<p class="dd-subtitle">מקור נתונים</p><ul class="dd-list">${detailsItemsHtml(sources)}</ul>` : `<p class="dd-note">אין מידע על מקור הנתונים.</p>`}
      ${errors.length ? `<p class="dd-subtitle">נתונים חסרים/חסומים</p><ul class="dd-list">${detailsItemsHtml(errors.slice(0, 8))}</ul>` : ""}
      <p class="dd-note dd-disclaimer">כלי לימודי בלבד ואינו ייעוץ השקעות. הבדיקות הן קירוב לכללים המתוארים במתודולוגיה.</p>
    </section>
  `;
}

function openRowDetails(index) {
  const row = detailsRows[index];
  const dialog = document.getElementById("detailsDialog");
  if (!row || !dialog) return;
  detailsOpener = document.activeElement;
  document.getElementById("detailsDialogTitle").textContent = row.m.symbol || "-";
  document.getElementById("detailsDialogSubtitle").textContent = [row.m.name, row.m.sector || row.m.industry].filter(Boolean).join(" · ");
  document.getElementById("detailsDialogBadges").innerHTML =
    `${decisionPill(row)}<span class="dd-score" title="ציון כולל">ציון כולל <b>${row.totalScore}</b></span>`;
  const body = document.getElementById("detailsDialogBody");
  body.innerHTML = detailsDialogBodyHtml(row);
  body.scrollTop = 0;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  document.getElementById("detailsDialogClose").focus();
}

function closeRowDetails() {
  const dialog = document.getElementById("detailsDialog");
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else { dialog.removeAttribute("open"); onRowDetailsClosed(); }
}

// Runs on every close (close button, Escape, backdrop): return focus to the button that opened the dialog.
function onRowDetailsClosed() {
  const target = detailsOpener && document.contains(detailsOpener) ? detailsOpener : document.querySelector("#shell-screen-results h2");
  detailsOpener = null;
  if (target) target.focus({ preventScroll: true });
}

function onRowDetailsBackdropClick(event) {
  if (event.target === event.currentTarget) closeRowDetails();
}

function renderTable() {
  const tbody = document.getElementById("stocksTable");
  const rows = lastResults.filter(row => {
    if (currentFilter === "all") return true;
    if (currentFilter === "strong") return row.decision === "strong";
    if (currentFilter === "watch") return row.decision === "watch";
    if (currentFilter === "reject") return row.decision === "reject";
    return true;
  });

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="36">אין תוצאות למסנן הזה</td></tr>`;
    return;
  }

  detailsRows = rows;
  tbody.innerHTML = rows.map((row, index) => {
    const m = row.m;
    return `
      <tr>
        <td>${index + 1}</td>
        <td class="ltr">${escapeHtml(m.symbol || "-")}</td>
        <td>${escapeHtml(m.name || "-")}</td>
        <td>${escapeHtml(m.sector || m.industry || "-")}</td>
        <td class="num">${formatMoney(m.price)}</td>
        <td class="num">${formatPercentValue(m.changePercentage, false)}</td>
        <td class="num">${formatNumber(m.marketCap)}</td>
        <td class="num">${formatRatio(m.pe)}</td>
        <td class="num">${formatRatio(m.ps)}</td>
        <td class="num">${formatRatio(m.pb)}</td>
        <td class="num">${formatPercentValue(m.roe, true)}</td>
        <td class="num">${formatPercentValue(m.roa, true)}</td>
        <td class="num">${formatRatio(m.debtEquity)}</td>
        <td class="num">${formatRatio(m.currentRatio)}</td>
        <td class="num">${formatNumber(m.fcf)}</td>
        <td>${formatDividend(m)}</td>
        <td>${categoryPill(row.quick.score)}</td>
        <td>${categoryPill(row.value.graham.pct)}</td>
        <td>${categoryPill(row.value.fisher.pct)}</td>
        <td>${categoryPill(row.value.cash.pct)}</td>
        <td>${categoryPill(row.value.buffett.pct)}</td>
        <td>${row.value.piotroski.score === null ? `<span class="pill gray">חסר</span>` : `<span class="pill ${row.value.piotroski.score >= 7 ? "good" : row.value.piotroski.score >= 5 ? "warn" : "bad"}">${row.value.piotroski.score}/9</span>`}</td>
        <td>${categoryPill(row.value.dreman?.pct)}</td>
        <td>${categoryPill(row.value.neff?.pct)}</td>
        <td>${relativeBasisCell(row)}</td>
        <td class="num">${row.dcf?.fairValuePerShare === null ? dcfMissingCell() : formatMoney(row.dcf.fairValuePerShare)}</td>
        <td class="num">${m.price !== null ? formatMoney(m.price) : dcfMissingCell()}</td>
        <td class="num">${row.dcf?.upsidePct === null ? dcfMissingCell() : formatPercentValue(row.dcf.upsidePct, true)}</td>
        <td class="num">${row.dcf?.discountFromFairValuePct === null ? dcfMissingCell() : formatPercentValue(row.dcf.discountFromFairValuePct, true)}</td>
        <td>${dcfMarginCell(row.dcf)}</td>
        <td>${dcfConfidencePill(row.dcf)}</td>
        <td>${confidencePill(row.dataConfidence)}</td>
        <td>${dataSourcePill(row)}</td>
        <td class="score">${row.totalScore}</td>
        <td>${decisionPill(row)}</td>
        <td>${renderDetails(row, index)}</td>
      </tr>
    `;
  }).join("");
}

function setTableFilter(filter) {
  currentFilter = filter;
  ["tabAll", "tabStrong", "tabWatch", "tabReject"].forEach(id => document.getElementById(id).classList.remove("active"));
  const map = { all: "tabAll", strong: "tabStrong", watch: "tabWatch", reject: "tabReject" };
  document.getElementById(map[filter]).classList.add("active");
  renderTable();
}

function updateSummary() {
  const summaryRows = allResults.length ? allResults : lastResults;
  const checked = lastScanStats.checked || summaryRows.length;
  const passed = summaryRows.filter(r => r.passBasic).length;
  const strong = summaryRows.filter(r => r.decision === "strong").length;
  const avg = summaryRows.length ? summaryRows.reduce((s,r)=>s+r.totalScore,0)/summaryRows.length : 0;
  document.getElementById("checkedCount").textContent = checked;
  document.getElementById("passedCount").textContent = passed;
  document.getElementById("strongCount").textContent = strong;
  document.getElementById("averageScore").textContent = avg.toFixed(1);
  document.getElementById("bestStock").textContent = summaryRows[0] ? summaryRows[0].m.symbol : "-";

  const ts = lastScanStats.twoStage;
  const twoStageEl = document.getElementById("twoStageSummary");
  if (!ts) {
    twoStageEl.textContent = "";
    return;
  }
  const skipped = ts.inputCount > ts.stage1Total ? ` · ${ts.inputCount - ts.stage1Total} סימולים מעבר ל־Stage 1 max לא נבדקו` : "";
  const preliminary = ts.preliminaryOnly ? " · ⚠️ Table shows preliminary Stage 1 quote-level rows only — not final Deep Scan results" : "";
  twoStageEl.textContent = `Two-stage scan: Stage 1 checked ${ts.stage1Checked}/${ts.stage1Total} (quote-level) · Candidates selected: ${ts.candidatesSelected} (Top N = ${ts.topN}) · Stage 2 deep-scanned: ${ts.stage2Scanned}/${ts.stage2Total} · API: ${lastScanStats.apiCalls} · Cache: ${lastScanStats.cacheHits}${skipped}${preliminary}`;
}

function resetResults() {
  lastResults = [];
  allResults = [];
  lastScanStats = { checked: 0, apiCalls: 0, cacheHits: 0, stopped: false };
  document.getElementById("stocksTable").innerHTML = `<tr><td colspan="36">טוען נתונים...</td></tr>`;
  updateSummary();
}
