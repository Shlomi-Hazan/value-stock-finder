// Value Stock Finder: App shell (ADR-0005, stage 1): hash navigation between the Setup and Results screens,
// and a global scan bar that mirrors #status and offers Stop on every screen.
// Classic script, loaded after app.js and self-initializing (a documented exception to ADR-0004's
// "only app.js runs code at load time" rule, so no existing script has to change).
// It only observes existing elements and calls the existing global requestStopScan(); it never
// touches scanning, scoring, providers, caching, rendering or localStorage.

const SHELL_ROUTES = { "#/setup": "setup", "#/results": "results" };
const SHELL_DEFAULT_SCREEN = "setup";
const SHELL_BASE_TITLE = document.title;
const shellScrollMemory = {};
let shellCurrentScreen = null;
let shellScanRunning = false;
let shellResultsUnseen = false;
let shellFinalVisible = false;   // last scan's final status stays in the bar until dismissed

function shellPrefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Maps a location hash to { screen, target }: shell routes, element-ID hashes (for example the
// workflow strip's #sec-scan) resolved to the screen that contains them, else the default screen.
function shellResolveHash(hash) {
  if (SHELL_ROUTES[hash]) return { screen: SHELL_ROUTES[hash], target: null };
  if (hash && hash.length > 1) {
    let id = hash.slice(1);
    try { id = decodeURIComponent(id); } catch (_) {}
    const el = document.getElementById(id);
    const owner = el && el.closest("[data-screen]");
    if (owner) return { screen: owner.dataset.screen, target: el };
  }
  return { screen: SHELL_DEFAULT_SCREEN, target: null };
}

function shellScreens() {
  return [...document.querySelectorAll("main > .screen[data-screen]")];
}

function shellShowScreen(screen, { target = null, moveFocus = true } = {}) {
  const changed = screen !== shellCurrentScreen;
  if (changed && shellCurrentScreen) shellScrollMemory[shellCurrentScreen] = window.scrollY;

  let screenEl = null;
  shellScreens().forEach(el => {
    const active = el.dataset.screen === screen;
    el.hidden = !active;
    if (active) screenEl = el;
  });
  document.querySelectorAll(".shell-tab[data-route]").forEach(tab => {
    if (tab.dataset.route === screen) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  document.body.dataset.screen = screen;
  shellCurrentScreen = screen;
  if (screenEl) document.title = `${screenEl.dataset.title} · ${SHELL_BASE_TITLE}`;

  if (screen === "results") shellSetResultsUnseen(false);
  shellUpdateResultsEmptyHint();
  shellUpdateScanBar();

  const behavior = shellPrefersReducedMotion() ? "auto" : "smooth";
  if (target) {
    target.scrollIntoView({ behavior, block: "start" });
    if (moveFocus) shellFocus(target.querySelector("h2, h3, summary") || target);
  } else {
    if (changed) window.scrollTo({ top: shellScrollMemory[screen] || 0, behavior: "auto" });
    if (moveFocus && screenEl) shellFocus(screenEl.querySelector("h2"));
  }
}

function shellFocus(el) {
  if (!el) return;
  if (!el.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName)) {
    el.setAttribute("tabindex", "-1");
  }
  el.focus({ preventScroll: true });
}

function shellOnHashChange() {
  const { screen, target } = shellResolveHash(location.hash);
  shellShowScreen(screen, { target });
}

/* ---------- Results cue ---------- */

// Real result rows have one cell per column; message rows (empty state, errors) have a single cell.
function shellHasResults() {
  const tbody = document.getElementById("stocksTable");
  return !!(tbody && [...tbody.rows].some(row => row.cells.length > 1));
}

function shellSetResultsUnseen(unseen) {
  shellResultsUnseen = unseen;
  document.getElementById("shell-results-dot").hidden = !unseen;
  document.getElementById("shell-results-dot-label").hidden = !unseen;
}

function shellUpdateResultsEmptyHint() {
  document.getElementById("shell-results-empty").hidden = shellHasResults() || shellScanRunning;
}

/* ---------- Global scan bar ---------- */

// Keeps section anchors from landing under the sticky shell bar, whose height changes with the scan bar.
function shellSyncOffset() {
  const bar = document.getElementById("shell-bar");
  if (bar) document.documentElement.style.setProperty("--shell-offset", `${bar.offsetHeight + 16}px`);
}

function shellUpdateScanBar() {
  const bar = document.getElementById("shell-scanbar");
  const text = document.getElementById("shell-scan-text");
  const status = document.getElementById("status");
  const finished = !shellScanRunning && shellFinalVisible;

  bar.hidden = !(shellScanRunning || finished);
  bar.classList.toggle("is-running", shellScanRunning);
  text.textContent = status ? status.textContent : "";
  // #status is itself a live region on Setup, so announce from the bar only on other screens.
  text.setAttribute("aria-live", shellCurrentScreen === "setup" ? "off" : "polite");

  document.getElementById("shell-spinner").hidden = !shellScanRunning;
  document.getElementById("shell-stop").hidden = !shellScanRunning;
  document.getElementById("shell-results-link").hidden = !(finished && shellHasResults()) || shellCurrentScreen === "results";
  document.getElementById("shell-dismiss").hidden = shellScanRunning;
  shellSyncOffset();
}

// scanStocks() disables #scanButton while a scan runs and re-enables it in its finally block.
function shellOnScanButtonChange() {
  const running = document.getElementById("scanButton").disabled;
  if (running === shellScanRunning) return;
  shellScanRunning = running;
  if (running) {
    shellFinalVisible = false;
  } else {
    shellFinalVisible = true;
    shellSetResultsUnseen(shellHasResults() && shellCurrentScreen !== "results");
  }
  shellUpdateResultsEmptyHint();
  shellUpdateScanBar();
}

function initShell() {
  const statusEl = document.getElementById("status");
  const scanButton = document.getElementById("scanButton");
  const tbody = document.getElementById("stocksTable");

  new MutationObserver(shellUpdateScanBar).observe(statusEl, { childList: true, characterData: true, subtree: true });
  new MutationObserver(shellOnScanButtonChange).observe(scanButton, { attributes: true, attributeFilter: ["disabled"] });
  new MutationObserver(shellUpdateResultsEmptyHint).observe(tbody, { childList: true });

  document.getElementById("shell-stop").addEventListener("click", () => requestStopScan());
  document.getElementById("shell-dismiss").addEventListener("click", () => {
    shellFinalVisible = false;
    shellUpdateScanBar();
  });
  window.addEventListener("hashchange", shellOnHashChange);
  window.addEventListener("resize", shellSyncOffset);

  // Initial screen: move focus only when the URL asked for a specific screen or section.
  const { screen, target } = shellResolveHash(location.hash);
  shellShowScreen(screen, { target, moveFocus: !!location.hash && location.hash !== "#" });
}

initShell();
