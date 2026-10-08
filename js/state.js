// Value Stock Finder: Shared in-memory UI / scan state. Other scripts read and reassign these globals.
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

let lastResults = [];

let allResults = [];

let currentFilter = "all";

let stopRequested = false;

let lastScanStats = { checked: 0, apiCalls: 0, cacheHits: 0, stopped: false };
