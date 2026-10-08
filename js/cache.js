// Value Stock Finder: localStorage response cache for FMP and Yahoo, plus Clear Cache.
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

function cacheTtlForPath(path) {
  return path === "/stable/quote" ? QUOTE_CACHE_TTL_MS : FUNDAMENTAL_CACHE_TTL_MS;
}

function cacheKey(path, symbol, extra = {}) {
  return FMP_CACHE_PREFIX + [path, symbol, stableStringify(extra)].join("|");
}

function readCachedFmp(path, symbol, extra = {}) {
  try {
    const raw = localStorage.getItem(cacheKey(path, symbol, extra));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || typeof cached.timestamp !== "number") return null;
    if (Date.now() - cached.timestamp > cacheTtlForPath(path)) return null;
    return cached.data;
  } catch (_) {
    return null;
  }
}

function writeCachedFmp(path, symbol, extra = {}, data) {
  try {
    localStorage.setItem(cacheKey(path, symbol, extra), JSON.stringify({ timestamp: Date.now(), data }));
  } catch (_) {}
}

function clearCache() {
  let count = 0;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(FMP_CACHE_PREFIX) || key.startsWith(YAHOO_CACHE_PREFIX))) {
      localStorage.removeItem(key);
      count++;
    }
  }
  updateRequestPreview();
  setStatus(`נמחקו ${count} פריטי Cache`, "good");
}

// Yahoo Finance Experimental: unofficial, keyless chart endpoint. Quote-level data only;
// usually blocked by browser CORS, so every failure is surfaced as a clean, non-fatal error.
function yahooCacheKey(symbol) {
  return YAHOO_CACHE_PREFIX + symbol;
}

function readCachedYahoo(symbol) {
  try {
    const raw = localStorage.getItem(yahooCacheKey(symbol));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || typeof cached.timestamp !== "number") return null;
    if (Date.now() - cached.timestamp > QUOTE_CACHE_TTL_MS) return null;
    return cached.data;
  } catch (_) {
    return null;
  }
}

function writeCachedYahoo(symbol, data) {
  try {
    localStorage.setItem(yahooCacheKey(symbol), JSON.stringify({ timestamp: Date.now(), data }));
  } catch (_) {}
}
