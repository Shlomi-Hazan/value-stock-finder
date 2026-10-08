// Value Stock Finder: Data providers: provider selection, FMP client (quote + deep endpoints), Yahoo Finance Experimental / Browser test only, and the provider entry points.
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

function getSelectedProvider() {
  const value = document.getElementById("dataProvider")?.value;
  return PROVIDERS[value] ? value : DEFAULT_PROVIDER;
}

function providerLabel(provider) {
  return (PROVIDERS[provider] || PROVIDERS[DEFAULT_PROVIDER]).label;
}

function endpointsForMode(mode) {
  const endpoints = [{ key: "quote", label: "Quote", path: "/stable/quote", extra: {} }];
  return mode === "deep" ? endpoints.concat(DEEP_ENDPOINTS) : endpoints;
}

function isRateLimitMessage(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("limit reach") ||
    text.includes("limit reached") ||
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    text.includes("request limit") ||
    text.includes("daily limit") ||
    text.includes("api limit") ||
    text.includes("429");
}

function rateLimitError(message, provider = "fmp") {
  const name = provider === "yahoo" ? "Yahoo" : "FMP";
  const err = new Error(`הגעת למגבלת הבקשות של ${name}. הסריקה נעצרה כדי לא לבזבז קריאות נוספות.`);
  err.rateLimited = true;
  err.detail = message;
  return err;
}

async function fetchJson(url) {
  const response = await fetch(url.toString());
  let data = null;
  try { data = await response.json(); } catch (_) {}

  if (!response.ok) {
    const msg = data && (data["Error Message"] || data.error || data.message) ? (data["Error Message"] || data.error || data.message) : ("HTTP " + response.status);
    if (response.status === 429 || isRateLimitMessage(msg)) throw rateLimitError(msg);
    throw new Error(msg);
  }

  if (data && typeof data === "object") {
    const text = JSON.stringify(data).toLowerCase();
    if (isRateLimitMessage(text)) throw rateLimitError(text);
    if (text.includes("restricted endpoint") || text.includes("not available under your current subscription")) {
      throw new Error("Restricted Endpoint");
    }
  }

  return data;
}

async function callFmp(path, symbol, apiKey, extra = {}) {
  const cached = readCachedFmp(path, symbol, extra);
  if (cached !== null) return { data: cached, source: "cache" };

  const url = new URL("https://financialmodelingprep.com" + path);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  const data = await fetchJson(url);
  writeCachedFmp(path, symbol, extra, data);
  return { data, source: "api" };
}

async function safeCall(path, symbol, apiKey, extra = {}) {
  try {
    const result = await callFmp(path, symbol, apiKey, extra);
    return { ok: true, data: result.data, source: result.source, error: null, rateLimited: false };
  } catch (e) {
    return { ok: false, data: null, source: null, error: e.message || "שגיאה", rateLimited: !!e.rateLimited, detail: e.detail || null };
  }
}

async function fetchStockData(symbol, apiKey, mode) {
  const out = {
    symbol,
    provider: "fmp",
    quote: null,
    profile: null,
    ratiosTtm: null,
    keyMetricsTtm: null,
    ratiosAnnual: [],
    keyMetricsAnnual: [],
    income: [],
    cash: [],
    balance: [],
    growth: [],
    endpointErrors: [],
    endpointSources: [],
    apiCalls: 0,
    cacheHits: 0
  };

  const quote = await safeCall("/stable/quote", symbol, apiKey);
  if (quote.ok) {
    out.quote = firstArrayItem(quote.data);
    out.endpointSources.push("Quote: " + quote.source);
    if (quote.source === "cache") out.cacheHits++;
    if (quote.source === "api") out.apiCalls++;
  } else {
    out.endpointErrors.push("Quote: " + quote.error);
    if (quote.rateLimited) throw rateLimitError(quote.detail || quote.error);
  }

  if (mode === "quick") return out;

  for (const { key, label, path, extra } of DEEP_ENDPOINTS) {
    const res = await safeCall(path, symbol, apiKey, extra);
    if (res.ok) {
      if (key === "profile" || key === "ratiosTtm" || key === "keyMetricsTtm") out[key] = firstArrayItem(res.data);
      else out[key] = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      out.endpointSources.push(label + ": " + res.source);
      if (res.source === "cache") out.cacheHits++;
      if (res.source === "api") out.apiCalls++;
    } else {
      out.endpointErrors.push(label + ": " + res.error);
      if (res.rateLimited) throw rateLimitError(res.detail || res.error);
    }
    await sleep(70);
  }

  return out;
}

function yahooError(detail, blocked = false) {
  const err = new Error(YAHOO_FAILED_MESSAGE);
  err.detail = detail;
  err.providerBlocked = blocked;
  return err;
}

function trailingAverage(values, count) {
  const nums = values.map(numberOrNull).filter(v => v !== null);
  return nums.length >= count ? mean(nums.slice(-count)) : null;
}

// Maps the Yahoo chart response onto the FMP quote field names so buildMetrics() works unchanged.
function yahooChartToQuote(symbol, data) {
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta || numberOrNull(meta.regularMarketPrice) === null) {
    const desc = data?.chart?.error?.description || "invalid response";
    throw yahooError(desc);
  }
  const closes = result.indicators?.quote?.[0]?.close || [];
  const validCloses = closes.map(numberOrNull).filter(v => v !== null);
  const prevClose = validCloses.length >= 2 ? validCloses[validCloses.length - 2] : null;
  const price = numberOrNull(meta.regularMarketPrice);
  const changePercentage = numberOrNull(meta.regularMarketChangePercent)
    ?? (prevClose ? ((price / prevClose) - 1) * 100 : null);
  return {
    symbol: meta.symbol || symbol,
    name: meta.longName || meta.shortName || null,
    price,
    changePercentage,
    volume: numberOrNull(meta.regularMarketVolume),
    marketCap: null,
    priceAvg50: trailingAverage(closes, 50),
    priceAvg200: trailingAverage(closes, 200),
    yearHigh: numberOrNull(meta.fiftyTwoWeekHigh),
    yearLow: numberOrNull(meta.fiftyTwoWeekLow),
    exchange: meta.fullExchangeName || meta.exchangeName || null,
    currency: meta.currency || null
  };
}

async function fetchYahooQuote(symbol) {
  const cached = readCachedYahoo(symbol);
  if (cached !== null) return { data: cached, source: "cache" };

  const url = new URL(YAHOO_CHART_URL + encodeURIComponent(symbol));
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "1y");

  let response;
  try {
    response = await fetch(url.toString());
  } catch (e) {
    // Network-level failure (typically CORS): every following symbol would fail the same way.
    throw yahooError(e.message || "network error", true);
  }
  let data = null;
  try { data = await response.json(); } catch (_) {}
  if (response.status === 429) throw rateLimitError("HTTP 429", "yahoo");
  if (response.status === 401 || response.status === 403) throw yahooError("HTTP " + response.status, true);
  if (!response.ok) throw yahooError(data?.chart?.error?.description || ("HTTP " + response.status));

  const quote = yahooChartToQuote(symbol, data);
  writeCachedYahoo(symbol, quote);
  return { data: quote, source: "api" };
}

async function fetchQuoteData(provider, symbol, apiKey) {
  if (provider === "yahoo") return fetchYahooQuote(symbol);
  const result = await callFmp("/stable/quote", symbol, apiKey);
  return { data: firstArrayItem(result.data), source: result.source };
}

async function fetchStockDataByProvider(symbol, apiKey, mode, provider) {
  if (provider !== "yahoo") return fetchStockData(symbol, apiKey, mode);
  if (mode !== "quick") throw new Error(YAHOO_DEEP_BLOCKED_MESSAGE);

  const out = {
    symbol,
    provider: "yahoo",
    quote: null,
    profile: null,
    ratiosTtm: null,
    keyMetricsTtm: null,
    ratiosAnnual: [],
    keyMetricsAnnual: [],
    income: [],
    cash: [],
    balance: [],
    growth: [],
    endpointErrors: [],
    endpointSources: [],
    apiCalls: 0,
    cacheHits: 0
  };

  try {
    const res = await fetchQuoteData("yahoo", symbol);
    out.quote = res.data;
    out.endpointSources.push("Yahoo Quote (experimental): " + res.source);
    if (res.source === "cache") out.cacheHits++;
    if (res.source === "api") out.apiCalls++;
  } catch (e) {
    if (e.rateLimited || e.providerBlocked) throw e;
    out.endpointErrors.push("Yahoo Quote: " + (e.detail || e.message));
  }
  return out;
}
