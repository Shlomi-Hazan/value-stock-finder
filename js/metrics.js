// Value Stock Finder: Metric normalization (buildMetrics), derived metrics and Data Confidence.
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

function isTechOrPharma(profile, quote) {
  const text = [
    pick(profile, ["sector", "industry"]),
    pick(quote, ["exchange", "name"])
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes("technology") || text.includes("software") || text.includes("semiconductor") || text.includes("pharma") || text.includes("biotech") || text.includes("healthcare");
}

function isUsListed(exchange) {
  const text = String(exchange || "").toLowerCase();
  return ["nasdaq", "nyse", "amex", "arca", "cboe", "us"].some(x => text.includes(x));
}

function buildMetrics(raw) {
  const q = raw.quote || {};
  const p = raw.profile || {};
  const r = raw.ratiosTtm || {};
  const km = raw.keyMetricsTtm || {};
  const income0 = raw.income[0] || {};
  const cash0 = raw.cash[0] || {};
  const bal0 = raw.balance[0] || {};
  const growth0 = raw.growth[0] || {};

  const price = pickNum(q, ["price"]);
  const marketCap = pickNum(q, ["marketCap"]) ?? pickNum(p, ["mktCap", "marketCap"]);
  const sector = pick(p, ["sector"]);
  const industry = pick(p, ["industry"]);
  const name = pick(q, ["name"]) ?? pick(p, ["companyName", "companyName"]);

  const pe = pickNum(r, ["priceEarningsRatioTTM", "peRatioTTM", "priceToEarningsRatioTTM"]) ?? pickNum(km, ["peRatioTTM", "priceEarningsRatioTTM"]) ?? pickNum(p, ["pe"]);
  const ps = pickNum(r, ["priceToSalesRatioTTM", "priceSalesRatioTTM"]) ?? pickNum(km, ["priceToSalesRatioTTM", "priceSalesRatioTTM"]);
  const pb = pickNum(r, ["priceToBookRatioTTM", "priceBookValueRatioTTM"]) ?? pickNum(km, ["pbRatioTTM", "priceToBookRatioTTM"]);
  const roe = pickNum(r, ["returnOnEquityTTM", "roeTTM"]) ?? pickNum(km, ["roeTTM", "returnOnEquityTTM"]);
  const roa = pickNum(r, ["returnOnAssetsTTM", "roaTTM"]) ?? pickNum(km, ["roaTTM", "returnOnAssetsTTM"]);
  const debtEquity = pickNum(r, ["debtEquityRatioTTM", "debtToEquityRatioTTM"]) ?? pickNum(km, ["debtToEquityTTM", "debtEquityRatioTTM"]);
  const currentRatio = pickNum(r, ["currentRatioTTM"]) ?? pickNum(km, ["currentRatioTTM"]);
  const profitMargin = pickNum(r, ["netProfitMarginTTM", "netProfitMargin"]);
  const grossMargin = pickNum(r, ["grossProfitMarginTTM"]);

  // Dividend data: yield usually comes from ratios/key metrics, lastDiv is usually the cash amount per share.
  const dividendAmount = pickNum(q, ["lastDiv", "dividend", "annualDividend"])
    ?? pickNum(p, ["lastDiv", "dividend", "annualDividend", "lastDividend"])
    ?? pickNum(km, ["dividendPerShareTTM", "dividendPerShare"]);

  const dividendYieldFromApi = pickNum(r, ["dividendYieldTTM", "dividendYielTTM", "dividendYield"])
    ?? pickNum(km, ["dividendYieldTTM", "dividendYield"]);

  const dividendYield = dividendYieldFromApi ?? (dividendAmount !== null && price ? dividendAmount / price : null);
  const paysDividend = (dividendAmount !== null && dividendAmount > 0) || (dividendYield !== null && dividendYield > 0);

  const fcfPerShare = pickNum(km, ["freeCashFlowPerShareTTM"]) ?? pickNum(r, ["freeCashFlowPerShareTTM"]);
  const operatingCashFlowPerShare = pickNum(km, ["operatingCashFlowPerShareTTM"]);

  const revenue = pickNum(income0, ["revenue"]);
  const netIncome = pickNum(income0, ["netIncome"]);
  const eps = pickNum(income0, ["eps", "epsdiluted"]);
  const grossProfit = pickNum(income0, ["grossProfit"]);

  const ocf = pickNum(cash0, ["operatingCashFlow", "netCashProvidedByOperatingActivities"]);
  const icf = pickNum(cash0, ["netCashUsedForInvestingActivites", "netCashUsedForInvestingActivities"]);
  const cff = pickNum(cash0, ["netCashUsedProvidedByFinancingActivities", "netCashProvidedByFinancingActivities"]);
  const fcf = pickNum(cash0, ["freeCashFlow"]);
  const capex = pickNum(cash0, ["capitalExpenditure", "capitalExpenditures"]);

  const totalAssets = pickNum(bal0, ["totalAssets"]);
  const longTermDebt = pickNum(bal0, ["longTermDebt"]);
  const totalDebt = pickNum(bal0, ["totalDebt"]);
  const totalEquity = pickNum(bal0, ["totalStockholdersEquity", "totalEquity"]);
  const currentAssets = pickNum(bal0, ["totalCurrentAssets"]);
  const currentLiabilities = pickNum(bal0, ["totalCurrentLiabilities"]);
  const shares = pickNum(bal0, ["commonStockSharesOutstanding"])
    ?? pickNum(q, ["sharesOutstanding"])
    ?? pickNum(p, ["sharesOutstanding", "weightedAverageShsOut", "weightedAverageShsOutDil"]);
  const workingCapital = currentAssets !== null && currentLiabilities !== null ? currentAssets - currentLiabilities : null;

  const revenueGrowth = pickNum(growth0, ["growthRevenue", "revenueGrowth"]);
  const netIncomeGrowth = pickNum(growth0, ["growthNetIncome", "netIncomeGrowth"]);
  const epsGrowth = pickNum(growth0, ["growthEPS", "epsgrowth", "epsGrowth"]);
  const fcfGrowth = pickNum(growth0, ["growthFreeCashFlow", "freeCashFlowGrowth"]);
  const ocfGrowth = pickNum(growth0, ["growthOperatingCashFlow", "operatingCashFlowGrowth"]);

  return {
    symbol: raw.symbol,
    name, sector, industry,
    price,
    changePercentage: pickNum(q, ["changePercentage", "changesPercentage"]),
    volume: pickNum(q, ["volume"]),
    marketCap,
    priceAvg50: pickNum(q, ["priceAvg50"]),
    priceAvg200: pickNum(q, ["priceAvg200"]),
    yearHigh: pickNum(q, ["yearHigh"]),
    yearLow: pickNum(q, ["yearLow"]),
    exchange: pick(q, ["exchange", "exchangeShortName"]),
    pe, ps, pb, roe, roa, debtEquity, currentRatio, profitMargin, grossMargin,
    dividendYield, dividendAmount, paysDividend,
    fcfPerShare, operatingCashFlowPerShare,
    revenue, netIncome, eps, grossProfit,
    ocf, icf, cff, fcf, capex,
    totalAssets, longTermDebt, totalDebt, totalEquity, currentAssets, currentLiabilities, shares, workingCapital,
    revenueGrowth, netIncomeGrowth, epsGrowth, fcfGrowth, ocfGrowth,
    raw,
    isTechPharma: isTechOrPharma(raw.profile, raw.quote),
    isUsListed: isUsListed(pick(q, ["exchange", "exchangeShortName"]))
  };
}

function epsAnnualCagr(m) {
  const income = m.raw.income || [];
  const epsVals = income.map(row => pickNum(row, ["eps", "epsdiluted"])).filter(v => v !== null).reverse();
  if (epsVals.length < 4) return null;
  const first = epsVals[0];
  const last = epsVals[epsVals.length - 1];
  const years = epsVals.length - 1;
  if (first === null || last === null || first <= 0 || last <= 0 || years <= 0) return null;
  return Math.pow(last / first, 1 / years) - 1;
}

function epsMultiYearTotalGrowth(m) {
  const income = m.raw.income || [];
  const epsVals = income.map(row => pickNum(row, ["eps", "epsdiluted"])).filter(v => v !== null).reverse();
  if (epsVals.length < 4) return null;
  const firstPeriodAvg = average(epsVals.slice(0, 2));
  const lastPeriodAvg = average(epsVals.slice(-2));
  if (!firstPeriodAvg || firstPeriodAvg <= 0 || lastPeriodAvg === null || lastPeriodAvg <= 0) return null;
  return (lastPeriodAvg / firstPeriodAvg) - 1;
}

function sumNetIncome5Y(m) {
  const income = m.raw.income || [];
  const nums = income.slice(0,5).map(row => pickNum(row, ["netIncome"])).filter(v => v !== null);
  return nums.length ? nums.reduce((a,b)=>a+b,0) : null;
}

function calcSloanRatio(m) {
  if (m.netIncome === null || m.ocf === null || m.icf === null || !m.totalAssets) return null;
  return (m.netIncome - m.ocf - m.icf) / m.totalAssets;
}

function computeDataConfidence(m) {
  const fields = [
    ["price", "Price", true],
    ["marketCap", "Market Cap", true],
    ["volume", "Volume", true],
    ["pe", "P/E", false],
    ["ps", "P/S", false],
    ["pb", "P/B", false],
    ["roe", "ROE", false],
    ["roa", "ROA", false],
    ["debtEquity", "Debt/Equity", false],
    ["currentRatio", "Current Ratio", false],
    ["revenue", "Revenue", false],
    ["netIncome", "Net Income", false],
    ["ocf", "Operating Cash Flow", false],
    ["fcf", "Free Cash Flow", false],
    ["totalAssets", "Total Assets", false],
    ["longTermDebt", "Long-Term Debt", false],
    ["currentAssets", "Current Assets", false],
    ["currentLiabilities", "Current Liabilities", false],
    ["shares", "Shares Outstanding", false]
  ];
  const missing = fields.filter(([key]) => m[key] === null || m[key] === undefined).map(([, label]) => label);
  const coreMissing = fields.filter(([key, _label, core]) => core && (m[key] === null || m[key] === undefined)).map(([, label]) => label);
  const available = fields.length - missing.length;
  const pct = Math.round((available / fields.length) * 100);
  return {
    available,
    total: fields.length,
    pct,
    missing,
    coreMissing,
    strongEnough: pct >= DATA_CONFIDENCE_STRONG_MIN && coreMissing.length === 0
  };
}

function priceToOperatingCashFlow(m) {
  if (m.operatingCashFlowPerShare !== null && m.operatingCashFlowPerShare > 0 && m.price !== null) {
    return m.price / m.operatingCashFlowPerShare;
  }
  if (m.marketCap !== null && m.ocf !== null && m.ocf > 0) {
    return m.marketCap / m.ocf;
  }
  return null;
}
