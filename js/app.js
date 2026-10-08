// Value Stock Finder: App initialization and settings handlers. Loaded last: it calls initializePage().
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

function initializePage() {
  try {
    const savedKey = localStorage.getItem("valueStockFinderApiKey");
    if (savedKey) document.getElementById("apiKey").value = savedKey;
  } catch (_) {}
  try {
    const savedProvider = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (PROVIDERS[savedProvider]) document.getElementById("dataProvider").value = savedProvider;
  } catch (_) {}
  loadPresetList();
  onProviderChange();
}

function onProviderChange() {
  const provider = getSelectedProvider();
  try { localStorage.setItem(PROVIDER_STORAGE_KEY, provider); } catch (_) {}
  document.getElementById("providerWarning").style.display = provider === "yahoo" ? "block" : "none";
  updateRequestPreview();
}

function loadPresetList() {
  const value = document.getElementById("presetList").value;
  if (value === "manual") return;
  document.getElementById("symbolsInput").value = (PRESET_LISTS[value] || PRESET_LISTS.usaLarge).join(", ");
  updateRequestPreview();
}

function clearApiKey() {
  localStorage.removeItem("valueStockFinderApiKey");
  document.getElementById("apiKey").value = "";
  setStatus("ה־API Key נמחק מהדפדפן", "good");
}

// All scripts are loaded (deferred, in order) and the DOM is parsed when this runs.
initializePage();
