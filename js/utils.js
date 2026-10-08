// Value Stock Finder: Generic helpers: escaping, parsing, number handling, formatting, math and input clamping.
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseSymbols(text) {
  return text
    .split(/[\s,;]+/)
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
    .filter((s, i, arr) => arr.indexOf(s) === i);
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function stableStringify(obj) {
  const sorted = {};
  Object.keys(obj || {}).sort().forEach(key => { sorted[key] = obj[key]; });
  return JSON.stringify(sorted);
}

function clampIntInput(id, fallback, min, max, writeBack = false) {
  const el = document.getElementById(id);
  const n = numberOrNull(el?.value);
  const value = Math.round(clamp(n === null ? fallback : n, min, max));
  if (writeBack && el && el.value !== String(value)) el.value = value;
  return value;
}

function numberOrNull(v) {
  if (v === null || v === undefined || v === "" || v === "None") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pick(obj, names) {
  if (!obj) return null;
  for (const name of names) {
    if (obj[name] !== undefined && obj[name] !== null && obj[name] !== "") return obj[name];
  }
  return null;
}

function pickNum(obj, names) { return numberOrNull(pick(obj, names)); }

function firstArrayItem(data) {
  if (Array.isArray(data)) return data.length ? data[0] : null;
  if (data && typeof data === "object") return data;
  return null;
}

function formatNumber(value) {
  const n = numberOrNull(value);
  if (n === null) return "-";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "T";
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toLocaleString();
}

function formatMoney(value) {
  const n = numberOrNull(value);
  if (n === null) return "-";
  return "$" + n.toFixed(2);
}

function formatRatio(value, digits = 2) {
  const n = numberOrNull(value);
  return n === null ? "-" : n.toFixed(digits);
}

function formatPercentValue(value, assumeDecimal = true) {
  const n = numberOrNull(value);
  if (n === null) return "-";
  const pct = assumeDecimal && Math.abs(n) <= 1 ? n * 100 : n;
  const cls = pct > 0 ? "good-text" : pct < 0 ? "bad-text" : "muted";
  const sign = pct > 0 ? "+" : "";
  return `<span class="${cls}">${sign}${pct.toFixed(2)}%</span>`;
}

function average(arr) {
  const nums = arr.filter(v => numberOrNull(v) !== null).map(Number);
  return nums.length ? nums.reduce((a,b)=>a+b,0) / nums.length : null;
}

function mean(values) {
  const nums = values.map(numberOrNull).filter(v => v !== null && Number.isFinite(v));
  return nums.length ? nums.reduce((a,b)=>a+b,0) / nums.length : null;
}

function positiveMean(values) {
  const nums = values.map(numberOrNull).filter(v => v !== null && Number.isFinite(v) && v > 0);
  return nums.length ? nums.reduce((a,b)=>a+b,0) / nums.length : null;
}

function safeRatio(numerator, denominator) {
  const a = numberOrNull(numerator);
  const b = numberOrNull(denominator);
  if (a === null || b === null || b <= 0) return null;
  return a / b;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parsePercentInput(id, fallback) {
  const value = numberOrNull(document.getElementById(id)?.value);
  return (value === null ? fallback : value) / 100;
}
