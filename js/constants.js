// Value Stock Finder: Constants: preset symbol lists, FMP endpoints, providers, cache TTLs, scoring / DCF limits and Two-stage settings.
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

const PRESET_LISTS = {
  usaLarge: [
    "AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "AMZN", "META", "TSLA", "AVGO", "BRK-B",
    "JPM", "V", "MA", "UNH", "LLY", "XOM", "COST", "WMT", "HD", "PG",
    "NFLX", "JNJ", "ORCL", "ABBV", "BAC", "KO", "CRM", "AMD", "PEP", "ADBE"
  ],
  usaValue: [
    "BRK-B", "JPM", "BAC", "WFC", "C", "XOM", "CVX", "COP", "OXY", "JNJ",
    "PFE", "MRK", "ABBV", "BMY", "T", "VZ", "KO", "PEP", "PG", "WMT",
    "HD", "LOW", "CAT", "DE", "UPS", "UNP", "CSX", "LMT", "RTX", "HON"
  ],
  usaTech: [
    "AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "META", "TSLA", "AVGO", "AMD", "ADBE",
    "CRM", "ORCL", "NFLX", "INTC", "CSCO", "QCOM", "TXN", "AMAT", "MU", "NOW",
    "PANW", "SNOW", "SHOP", "PLTR", "UBER", "ABNB", "PYPL", "CRWD", "NET", "DDOG"
  ],
  usaDividend: [
    "KO", "PEP", "PG", "JNJ", "ABBV", "MRK", "PFE", "XOM", "CVX", "MCD",
    "WMT", "COST", "HD", "LOW", "T", "VZ", "IBM", "MMM", "CAT", "DE",
    "UPS", "UNP", "LMT", "RTX", "HON", "SO", "DUK", "NEE", "O", "MO"
  ],
  usaLargeExpanded: [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "BRK-B", "JPM",
    "V", "MA", "UNH", "LLY", "XOM", "COST", "WMT", "HD", "PG", "NFLX",
    "JNJ", "ORCL", "ABBV", "BAC", "KO", "CRM", "AMD", "PEP", "ADBE", "CSCO",
    "TMO", "ACN", "MCD", "ABT", "LIN", "DHR", "TXN", "QCOM", "INTU", "AMAT",
    "IBM", "GE", "CAT", "NOW", "ISRG", "VZ", "T", "CMCSA", "DIS", "PFE",
    "MRK", "AMGN", "NEE", "UNP", "RTX", "HON", "LOW", "SPGI", "GS", "MS",
    "BLK", "SCHW", "AXP", "C", "WFC", "BKNG", "UBER", "PM", "MO", "LMT",
    "BA", "DE", "MDT", "SYK", "GILD", "VRTX", "REGN", "ADP", "ADI", "LRCX",
    "MU", "KLAC", "PANW", "SBUX", "TJX", "NKE", "MDLZ", "CVX", "COP", "PLD"
  ],
  usaValueExpanded: [
    "BRK-B", "JPM", "BAC", "WFC", "C", "USB", "PNC", "TFC", "GS", "MS",
    "SCHW", "COF", "BK", "STT", "MET", "PRU", "AIG", "ALL", "TRV", "CB",
    "AFL", "XOM", "CVX", "COP", "OXY", "EOG", "PSX", "MPC", "VLO", "SLB",
    "KMI", "WMB", "JNJ", "PFE", "MRK", "ABBV", "BMY", "AMGN", "GILD", "CVS",
    "CI", "ELV", "MDT", "ABT", "T", "VZ", "CMCSA", "IBM", "CSCO", "INTC",
    "QCOM", "TXN", "HPQ", "DELL", "KO", "PEP", "PG", "MO", "PM", "HSY",
    "GIS", "CL", "KMB", "MDLZ", "WMT", "TGT", "KR", "DG", "HD", "LOW",
    "CAT", "DE", "UPS", "FDX", "UNP", "CSX", "ADM", "LMT", "RTX", "GD",
    "NOC", "HON", "MMM", "EMR", "ETN", "ITW", "F", "GM", "NUE", "DOW",
    "DUK", "SO", "D", "AEP", "EXC"
  ],
  usaDividendExpanded: [
    "KO", "PEP", "PG", "JNJ", "ABBV", "MRK", "PFE", "XOM", "CVX", "MCD",
    "WMT", "COST", "HD", "LOW", "T", "VZ", "IBM", "MMM", "CAT", "DE",
    "UPS", "UNP", "LMT", "RTX", "HON", "SO", "DUK", "NEE", "O", "MO",
    "PM", "CL", "KMB", "GIS", "SYY", "ADP", "ITW", "EMR", "GPC", "TROW",
    "BLK", "AFL", "CB", "ED", "XEL", "AEP", "D", "WEC", "SRE", "PLD",
    "SPG", "VICI", "OKE", "KMI", "PSX", "TXN", "CSCO", "AVGO", "ABT", "MDT"
  ]
};

const FMP_CACHE_PREFIX = "valueStockFinderFmpCache:";

const QUOTE_CACHE_TTL_MS = 10 * 60 * 1000;

const FUNDAMENTAL_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DATA_CONFIDENCE_STRONG_MIN = 70;

const RELATIVE_MIN_PEERS = 3;

const DCF_MAX_GROWTH_RATE = 0.08;

const DEEP_ENDPOINTS = [
  { key: "profile", label: "Profile", path: "/stable/profile", extra: {} },
  { key: "ratiosTtm", label: "Ratios TTM", path: "/stable/ratios-ttm", extra: {} },
  { key: "keyMetricsTtm", label: "Key Metrics TTM", path: "/stable/key-metrics-ttm", extra: {} },
  { key: "ratiosAnnual", label: "Ratios Annual", path: "/stable/ratios", extra: { period: "annual", limit: "5" } },
  { key: "keyMetricsAnnual", label: "Key Metrics Annual", path: "/stable/key-metrics", extra: { period: "annual", limit: "5" } },
  { key: "income", label: "Income Statement", path: "/stable/income-statement", extra: { period: "annual", limit: "5" } },
  { key: "cash", label: "Cash Flow", path: "/stable/cash-flow-statement", extra: { period: "annual", limit: "5" } },
  { key: "balance", label: "Balance Sheet", path: "/stable/balance-sheet-statement", extra: { period: "annual", limit: "5" } },
  { key: "growth", label: "Financial Growth", path: "/stable/financial-growth", extra: { period: "annual", limit: "5" } }
];

const PROVIDERS = {
  fmp: { label: "Financial Modeling Prep", supportsDeep: true, needsApiKey: true },
  yahoo: { label: "Yahoo Finance Experimental / Browser test only", supportsDeep: false, needsApiKey: false }
};

const DEFAULT_PROVIDER = "fmp";

const PROVIDER_STORAGE_KEY = "valueStockFinderProvider";

const YAHOO_CACHE_PREFIX = "valueStockFinderYahooCache:";

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";

const YAHOO_FAILED_MESSAGE = "Yahoo quote request failed. This may be blocked by browser/CORS or Yahoo restrictions.";

const YAHOO_DEEP_BLOCKED_MESSAGE = "Yahoo Experimental currently supports quote-level scan only. Use FMP for Deep Scan / DCF.";

const YAHOO_TWO_STAGE_BLOCKED_MESSAGE = "Yahoo Experimental / Browser test only does not support Two-stage scan because Stage 2 requires FMP Deep Scan.";

const TWO_STAGE_DEFAULT_MAX_SYMBOLS = 50;

const TWO_STAGE_MAX_SYMBOLS_LIMIT = 200;

const TWO_STAGE_DEFAULT_TOP_N = 10;

const TWO_STAGE_TOP_N_LIMIT = 30;

// Same order of magnitude as the existing confirmation for a Deep Scan of more than 10 symbols (10 x 10 calls).
const TWO_STAGE_CONFIRM_CALLS = 100;

const TWO_STAGE_WARNING = "Two-stage scan can still use many FMP calls. Stage 1 is quote-level only; Stage 2 deep-scans only the top N candidates.";
