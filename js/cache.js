// Value Stock Finder: localStorage response cache for FMP and Yahoo, plus Clear Cache.
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

function cacheTtlForPath(path) {
  return path === "/stable/quote" ? QUOTE_CACHE_TTL_MS : FUNDAMENTAL_CACHE_TTL_MS;
}

function cacheKey(path, symbol, extra = {}) {
  return FMP_CACHE_PREFIX + [path, symbol, stableStringify(extra)].join("|");
}

// Returns { timestamp, data } or null for malformed entries (bad JSON, no numeric timestamp, no data).
function parseCacheEntry(raw) {
  try {
    const cached = JSON.parse(raw);
    if (!cached || typeof cached.timestamp !== "number" || !("data" in cached) || cached.data === undefined) return null;
    return cached;
  } catch (_) {
    return null;
  }
}

function readCachedFmp(path, symbol, extra = {}) {
  try {
    const key = cacheKey(path, symbol, extra);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = parseCacheEntry(raw);
    if (!cached) { localStorage.removeItem(key); return null; }
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
  // Collect first, then remove: removing while iterating shifts localStorage indexes and skips entries.
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(FMP_CACHE_PREFIX) || key.startsWith(YAHOO_CACHE_PREFIX))) keys.push(key);
  }
  keys.forEach(key => localStorage.removeItem(key));
  const count = keys.length;
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
    const key = yahooCacheKey(symbol);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = parseCacheEntry(raw);
    if (!cached) { localStorage.removeItem(key); return null; }
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
